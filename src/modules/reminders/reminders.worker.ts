import { env } from '../../config/env.js'
import { getLocalDate, getLocalTime } from '../../shared/utils/timezone.js'
import { ACTIVE_STATUSES } from '../appointments/appointments.constants.js'
import { retryTimeFor } from './reminder-schedule.js'
import type { ReminderChannel, ReminderContent, ReminderRecipient } from './reminder.types.js'
import {
  CLAIM_LEASE_MINUTES,
  MAX_ATTEMPTS,
  WORKER_BATCH_SIZE,
  WORKER_INTERVAL_MS,
} from './reminders.constants.js'
import { remindersRepository, type ReminderForSending } from './reminders.repository.js'

type Outcome = 'sent' | 'skipped' | 'cancelled' | 'retry' | 'failed'

const errorMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).slice(0, 500)

const toRecipient = ({ appointment: { patient } }: ReminderForSending): ReminderRecipient => ({
  firstName: patient.firstName,
  // The contact email wins; otherwise the email of the patient's account, if any
  email: patient.contactEmail ?? patient.user?.email ?? null,
  phone: patient.phone,
  emailRemindersOptIn: patient.emailRemindersOptIn,
  whatsappOptIn: patient.whatsappOptIn,
})

const toContent = ({ appointment }: ReminderForSending): ReminderContent => ({
  clinicName: env.CLINIC_NAME,
  patientFirstName: appointment.patient.firstName,
  doctorName: `${appointment.doctor.firstName} ${appointment.doctor.lastName}`,
  serviceName: appointment.service.name,
  date: getLocalDate(appointment.startsAt, env.CLINIC_TIMEZONE),
  time: getLocalTime(appointment.startsAt, env.CLINIC_TIMEZONE),
})

const isActive = (status: string) => (ACTIVE_STATUSES as readonly string[]).includes(status)

export type ReminderWorkerOptions = {
  // In order of preference: the first one that can reach the patient is used
  channels: ReminderChannel[]
  intervalMs?: number
  batchSize?: number
  // Tests pass a fixed clock
  now?: () => Date
}

export const createReminderWorker = ({
  channels,
  intervalMs = WORKER_INTERVAL_MS,
  batchSize = WORKER_BATCH_SIZE,
  now = () => new Date(),
}: ReminderWorkerOptions) => {
  // Sends one claimed reminder and records what happened. Never throws.
  const processReminder = async (id: string): Promise<Outcome> => {
    const reminder = await remindersRepository.findForSending(id)
    if (!reminder) return 'cancelled'
    const currentTime = now()

    // Cancelled or already started since the reminder was scheduled
    if (!isActive(reminder.appointment.status) || reminder.appointment.startsAt <= currentTime) {
      await remindersRepository.markCancelled(id)
      return 'cancelled'
    }

    // Consent is checked now, not when the appointment was booked
    const recipient = toRecipient(reminder)
    const channel = channels.find((candidate) => candidate.canReach(recipient))
    if (!channel) {
      await remindersRepository.markSkipped(
        id,
        'No channel can reach the patient (missing consent or contact data)',
      )
      return 'skipped'
    }

    try {
      const { providerMessageId } = await channel.send(recipient, toContent(reminder))
      await remindersRepository.markSent(id, {
        channel: channel.name,
        providerMessageId,
        sentAt: now(),
      })
      return 'sent'
    } catch (error) {
      // attempts was already increased when the reminder was claimed
      if (reminder.attempts >= MAX_ATTEMPTS) {
        await remindersRepository.markFailed(id, errorMessage(error))
        return 'failed'
      }
      await remindersRepository.markForRetry(id, {
        error: errorMessage(error),
        retryAt: retryTimeFor(reminder.attempts, now()),
      })
      return 'retry'
    }
  }

  // One pass: claims the due reminders and processes them one by one
  const runOnce = async () => {
    const currentTime = now()
    const ids = await remindersRepository.claimDue({
      now: currentTime,
      leaseUntil: new Date(currentTime.getTime() + CLAIM_LEASE_MINUTES * 60_000),
      limit: batchSize,
    })

    const summary: Record<Outcome, number> = {
      sent: 0,
      skipped: 0,
      cancelled: 0,
      retry: 0,
      failed: 0,
    }
    for (const id of ids) summary[await processReminder(id)] += 1
    return summary
  }

  let timer: NodeJS.Timeout | undefined
  let running: Promise<unknown> | undefined

  // Each tick waits for the previous one: two passes of the same worker never overlap
  const tick = () => {
    if (running) return
    running = runOnce()
      .then((summary) => {
        const total = Object.values(summary).reduce((sum, count) => sum + count, 0)
        if (total > 0) console.info('Reminders processed', summary)
      })
      .catch((error: unknown) => console.error('Reminder worker failed', error))
      .finally(() => {
        running = undefined
      })
  }

  return {
    runOnce,
    start() {
      if (timer) return
      tick()
      // unref(): the timer alone does not keep Node.js running
      timer = setInterval(tick, intervalMs).unref()
    },
    // Stops the timer and waits for the pass in progress, so shutdown never cuts a send
    async stop() {
      clearInterval(timer)
      timer = undefined
      await running
    },
  }
}

export type ReminderWorker = ReturnType<typeof createReminderWorker>
