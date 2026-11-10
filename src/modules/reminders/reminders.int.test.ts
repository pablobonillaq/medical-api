import { setTimeout as sleep } from 'node:timers/promises'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../db/prisma.js'
import type { MailMessage, MailTransport } from '../../shared/mail/mail-transport.js'
import {
  createDoctorWithService,
  createPatient,
  loginAs,
  resetDatabase,
  tomorrow,
  createUser,
} from '../../test/helpers.js'
import { appointmentsRepository } from '../appointments/appointments.repository.js'
import { createEmailChannel } from './channels/email.channel.js'
import { createReminderWorker } from './reminders.worker.js'
import type { ReminderChannel } from './reminder.types.js'
import { remindersRepository } from './reminders.repository.js'

const HOUR = 60 * 60 * 1000
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR)

// An SMTP stand-in: keeps the messages, and can fail the first `failures` sends
const createFakeTransport = (failures = 0) => {
  const sent: MailMessage[] = []
  let remainingFailures = failures
  const transport: MailTransport = {
    sendMail: (message) => {
      if (remainingFailures > 0) {
        remainingFailures -= 1
        return Promise.reject(new Error('SMTP server unavailable'))
      }
      sent.push(message)
      return Promise.resolve({ messageId: `<fake-${sent.length}@test>` })
    },
  }
  return { transport, sent }
}

// The real email channel and worker, with a fake transport and a clock set by the test
const createWorker = (transport: MailTransport, clock: () => Date) =>
  createReminderWorker({
    channels: [createEmailChannel(transport, 'Clínica <no-reply@clinica.test>')],
    now: clock,
  })

describe('appointment reminders (integration)', () => {
  let patient: Awaited<ReturnType<typeof createPatient>>
  let doctorId: string
  let serviceId: string

  beforeEach(async () => {
    await resetDatabase()
    const created = await createDoctorWithService()
    doctorId = created.doctor.id
    serviceId = created.service.id
    patient = await createPatient()
    await prisma.patient.update({
      where: { id: patient.id },
      data: { contactEmail: 'luz@correo.test', emailRemindersOptIn: true },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // Books through the repository, the same transaction the API uses
  const book = (hours: number) => {
    const startsAt = hoursFromNow(hours)
    return appointmentsRepository.create({
      patientId: patient.id,
      doctorId,
      serviceId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + HOUR / 2),
      notes: null,
      createdById: patient.user?.id ?? '',
    })
  }

  const reminderOf = (appointmentId: string) =>
    prisma.appointmentReminder.findFirstOrThrow({ where: { appointmentId } })

  describe('scheduling', () => {
    it('schedules, moves and cancels the reminder with the appointment through the API', async () => {
      const agent = await loginAs(patient.user?.email ?? '')
      const availability = await agent
        .get('/availability')
        .query({ doctorId, serviceId, date: tomorrow() })
        .expect(200)
      const [first, second] = availability.body.slots as { startsAt: string }[]
      if (!first || !second) throw new Error('The test doctor has no free slots')

      const booked = await agent
        .post('/appointments')
        .send({ doctorId, serviceId, startsAt: first.startsAt })
        .expect(201)
      const id = booked.body.appointment.id as string
      expect(await reminderOf(id)).toMatchObject({ status: 'pending', attempts: 0 })

      const before = await reminderOf(id)
      await agent
        .patch(`/appointments/${id}/reschedule`)
        .send({ startsAt: second.startsAt })
        .expect(200)
      const moved = await reminderOf(id)
      expect(moved.status).toBe('pending')
      expect(moved.scheduledFor.getTime()).toBeGreaterThanOrEqual(before.scheduledFor.getTime())

      await agent.patch(`/appointments/${id}/cancel`).send({}).expect(200)
      expect((await reminderOf(id)).status).toBe('cancelled')
    })

    it('schedules the reminder 24 hours before the appointment', async () => {
      const appointment = await book(72)

      const reminder = await reminderOf(appointment.id)

      expect(reminder.scheduledFor.getTime()).toBe(appointment.startsAt.getTime() - 24 * HOUR)
    })

    it('does not schedule a reminder for an appointment less than 2 hours away', async () => {
      const appointment = await book(1)

      expect(
        await prisma.appointmentReminder.count({ where: { appointmentId: appointment.id } }),
      ).toBe(0)
    })

    it('cancels the reminder once the appointment took place', async () => {
      const appointment = await book(72)

      await appointmentsRepository.updateStatus(appointment.id, 'completed')

      expect((await reminderOf(appointment.id)).status).toBe('cancelled')
    })
  })

  describe('worker', () => {
    it('sends nothing before its time, and sends it once its time arrives', async () => {
      const appointment = await book(72)
      const { transport, sent } = createFakeTransport()

      const early = await createWorker(transport, () => hoursFromNow(47)).runOnce()
      const onTime = await createWorker(transport, () => hoursFromNow(49)).runOnce()
      const again = await createWorker(transport, () => hoursFromNow(50)).runOnce()

      expect(early.sent).toBe(0)
      expect(onTime.sent).toBe(1)
      expect(again.sent).toBe(0)
      expect(sent).toHaveLength(1)
      expect(sent[0]?.to).toBe('luz@correo.test')
      expect(sent[0]?.subject).toContain('Recordatorio: tu cita del')
      expect(await reminderOf(appointment.id)).toMatchObject({
        status: 'sent',
        channel: 'email',
        providerMessageId: '<fake-1@test>',
        attempts: 1,
      })
    })

    it('uses the account email when the patient has no contact email', async () => {
      await prisma.patient.update({ where: { id: patient.id }, data: { contactEmail: null } })
      await book(72)
      const { transport, sent } = createFakeTransport()

      await createWorker(transport, () => hoursFromNow(49)).runOnce()

      expect(sent[0]?.to).toBe(patient.user?.email)
    })

    it('skips patients who did not agree to email reminders', async () => {
      await prisma.patient.update({
        where: { id: patient.id },
        data: { emailRemindersOptIn: false },
      })
      const appointment = await book(72)
      const { transport, sent } = createFakeTransport()

      const summary = await createWorker(transport, () => hoursFromNow(49)).runOnce()

      expect(summary.skipped).toBe(1)
      expect(sent).toHaveLength(0)
      expect((await reminderOf(appointment.id)).status).toBe('skipped')
    })

    it('does not send a reminder for an appointment that is no longer active', async () => {
      const appointment = await book(72)
      // Changed without the repository, as if the reminder had been left pending by mistake
      await prisma.appointment.update({
        where: { id: appointment.id },
        data: { status: 'cancelled' },
      })
      const { transport, sent } = createFakeTransport()

      const summary = await createWorker(transport, () => hoursFromNow(49)).runOnce()

      expect(summary.cancelled).toBe(1)
      expect(sent).toHaveLength(0)
    })

    it('retries a failed send later and succeeds when the server is back', async () => {
      const appointment = await book(72)
      const { transport, sent } = createFakeTransport(1)

      const first = await createWorker(transport, () => hoursFromNow(49)).runOnce()
      const failedOnce = await reminderOf(appointment.id)
      const second = await createWorker(transport, () => hoursFromNow(49.1)).runOnce()

      expect(first.retry).toBe(1)
      expect(failedOnce).toMatchObject({ status: 'pending', lastError: 'SMTP server unavailable' })
      expect(second.sent).toBe(1)
      expect(sent).toHaveLength(1)
      expect((await reminderOf(appointment.id)).attempts).toBe(2)
    })

    it('marks the reminder as failed after the last attempt', async () => {
      const appointment = await book(72)
      const { transport } = createFakeTransport(100)
      const outcomes: string[] = []

      // Each pass runs after the previous retry time (the longest wait is 60 minutes)
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const clock = () => hoursFromNow(49 + attempt * 1.1)
        const summary = await createWorker(transport, clock).runOnce()
        outcomes.push(summary.failed ? 'failed' : summary.retry ? 'retry' : 'none')
      }

      expect(outcomes).toEqual(['retry', 'retry', 'retry', 'retry', 'failed'])
      expect(await reminderOf(appointment.id)).toMatchObject({ status: 'failed', attempts: 5 })
    })

    it('never sends the same reminder twice when two workers run at the same moment', async () => {
      for (let index = 0; index < 5; index += 1) await book(72 + index)
      const { transport, sent } = createFakeTransport()
      const clock = () => hoursFromNow(60)

      const [a, b] = await Promise.all([
        createWorker(transport, clock).runOnce(),
        createWorker(transport, clock).runOnce(),
      ])

      expect(a.sent + b.sent).toBe(5)
      expect(sent).toHaveLength(5)
      expect(await prisma.appointmentReminder.count({ where: { status: 'sent' } })).toBe(5)
    })

    it('skips a walk-in patient who has no email at all', async () => {
      const walkIn = await prisma.patient.create({
        data: {
          firstName: 'Rosa',
          lastName: 'Ibarra',
          birthDate: new Date('1958-03-02T00:00:00.000Z'),
          phone: '+525598765432',
          emailRemindersOptIn: true,
        },
      })
      const startsAt = hoursFromNow(72)
      await appointmentsRepository.create({
        patientId: walkIn.id,
        doctorId,
        serviceId,
        startsAt,
        endsAt: new Date(startsAt.getTime() + HOUR / 2),
        notes: null,
        createdById: (await createUser('employee')).id,
      })
      const { transport, sent } = createFakeTransport()

      const summary = await createWorker(transport, () => hoursFromNow(49)).runOnce()

      expect(summary.skipped).toBe(1)
      expect(sent).toHaveLength(0)
    })

    it('saves the error of a channel that fails with something that is not an Error', async () => {
      const appointment = await book(72)
      const channel: ReminderChannel = {
        name: 'email',
        canReach: () => true,
        // Some libraries reject with a plain string
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        send: () => Promise.reject('connection timed out'),
      }

      await createReminderWorker({ channels: [channel], now: () => hoursFromNow(49) }).runOnce()

      expect(await reminderOf(appointment.id)).toMatchObject({
        status: 'pending',
        lastError: 'connection timed out',
      })
    })

    it('counts a claimed reminder that no longer exists as cancelled', async () => {
      await book(72)
      vi.spyOn(remindersRepository, 'findForSending').mockResolvedValue(null)
      const { transport, sent } = createFakeTransport()

      const summary = await createWorker(transport, () => hoursFromNow(49)).runOnce()

      expect(summary.cancelled).toBe(1)
      expect(sent).toHaveLength(0)
    })
  })

  describe('worker timer', () => {
    it('runs on a timer, one pass at a time, and stop() waits for the pass in progress', async () => {
      // Less than 24 hours away, so the reminder is due right now
      await book(3)
      const gate = Promise.withResolvers<void>()
      const send = vi.fn(async () => {
        await gate.promise
        return { providerMessageId: '<slow@test>' }
      })
      const channel: ReminderChannel = { name: 'email', canReach: () => true, send }
      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
      const worker = createReminderWorker({ channels: [channel], intervalMs: 5 })

      worker.start()
      worker.start() // already running: does nothing
      // Several ticks go by while the first send is still waiting
      await sleep(100)
      gate.resolve()
      await worker.stop()

      expect(send).toHaveBeenCalledTimes(1)
      expect(info).toHaveBeenCalledWith('Reminders processed', expect.objectContaining({ sent: 1 }))
      expect(await prisma.appointmentReminder.count({ where: { status: 'sent' } })).toBe(1)
    })

    it('logs nothing when there is nothing to send', async () => {
      const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)
      const worker = createWorker(createFakeTransport().transport, () => new Date())

      worker.start()
      await worker.stop()

      expect(info).not.toHaveBeenCalled()
    })

    it('logs a pass that fails instead of crashing', async () => {
      vi.spyOn(remindersRepository, 'claimDue').mockRejectedValue(new Error('database down'))
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const worker = createWorker(createFakeTransport().transport, () => new Date())

      worker.start()
      await worker.stop()

      expect(error).toHaveBeenCalledWith('Reminder worker failed', expect.any(Error))
    })
  })
})
