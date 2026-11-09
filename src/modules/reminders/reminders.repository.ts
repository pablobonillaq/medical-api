import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { ReminderChannel } from '../../generated/prisma/enums.js'
import { reminderTimeFor } from './reminder-schedule.js'

const KIND = 'day_before'

export const reminderForSendingInclude = {
  appointment: {
    select: {
      status: true,
      startsAt: true,
      patient: {
        select: {
          firstName: true,
          phone: true,
          contactEmail: true,
          emailRemindersOptIn: true,
          whatsappOptIn: true,
          user: { select: { email: true } },
        },
      },
      doctor: { select: { firstName: true, lastName: true } },
      service: { select: { name: true } },
    },
  },
} satisfies Prisma.AppointmentReminderInclude

export type ReminderForSending = Prisma.AppointmentReminderGetPayload<{
  include: typeof reminderForSendingInclude
}>

export const remindersRepository = {
  // Called inside the appointment's transaction when it is booked or rescheduled.
  // A reminder that was already sent is sent again for the new time.
  async scheduleFor(
    appointmentId: string,
    startsAt: Date,
    db: Prisma.TransactionClient = prisma,
    now = new Date(),
  ) {
    const scheduledFor = reminderTimeFor(startsAt, now)
    if (!scheduledFor) {
      await remindersRepository.cancelFor(appointmentId, db)
      return
    }
    await db.appointmentReminder.upsert({
      where: { appointmentId_kind: { appointmentId, kind: KIND } },
      create: { appointmentId, kind: KIND, scheduledFor },
      update: {
        scheduledFor,
        status: 'pending',
        attempts: 0,
        channel: null,
        lastError: null,
        providerMessageId: null,
        sentAt: null,
      },
    })
  },

  // The appointment was cancelled or already took place: pending reminders are not sent
  cancelFor: (appointmentId: string, db: Prisma.TransactionClient = prisma) =>
    db.appointmentReminder.updateMany({
      where: { appointmentId, status: 'pending' },
      data: { status: 'cancelled' },
    }),

  // Takes up to `limit` due reminders and hides them from other workers for a while.
  // FOR UPDATE SKIP LOCKED: if two API instances run this at the same moment, each one
  // skips the rows the other has locked, so a reminder is never taken twice.
  claimDue: async ({ now, leaseUntil, limit }: { now: Date; leaseUntil: Date; limit: number }) => {
    const rows = await prisma.$queryRaw<{ id: string }[]>`
      UPDATE appointment_reminders
      SET attempts = attempts + 1, scheduled_for = ${leaseUntil}, updated_at = ${now}
      WHERE id IN (
        SELECT id FROM appointment_reminders
        WHERE status = 'pending' AND scheduled_for <= ${now}
        ORDER BY scheduled_for
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id`
    return rows.map((row) => row.id)
  },

  findForSending: (id: string) =>
    prisma.appointmentReminder.findUnique({ where: { id }, include: reminderForSendingInclude }),

  markSent: (
    id: string,
    {
      channel,
      providerMessageId,
      sentAt,
    }: { channel: ReminderChannel; providerMessageId: string; sentAt: Date },
  ) =>
    prisma.appointmentReminder.update({
      where: { id },
      data: { status: 'sent', channel, providerMessageId, sentAt, lastError: null },
    }),

  markSkipped: (id: string, reason: string) =>
    prisma.appointmentReminder.update({
      where: { id },
      data: { status: 'skipped', lastError: reason },
    }),

  markCancelled: (id: string) =>
    prisma.appointmentReminder.update({ where: { id }, data: { status: 'cancelled' } }),

  markForRetry: (id: string, { error, retryAt }: { error: string; retryAt: Date }) =>
    prisma.appointmentReminder.update({
      where: { id },
      data: { status: 'pending', lastError: error, scheduledFor: retryAt },
    }),

  markFailed: (id: string, error: string) =>
    prisma.appointmentReminder.update({
      where: { id },
      data: { status: 'failed', lastError: error },
    }),
}
