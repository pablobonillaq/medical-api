import {
  MIN_REMINDER_LEAD_HOURS,
  REMINDER_LEAD_HOURS,
  RETRY_DELAYS_MINUTES,
} from './reminders.constants.js'

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000

// When the "day before" reminder of an appointment should be sent, or null if it is too late
export const reminderTimeFor = (startsAt: Date, now: Date): Date | null => {
  if (startsAt.getTime() - now.getTime() < MIN_REMINDER_LEAD_HOURS * HOUR) return null
  const dayBefore = new Date(startsAt.getTime() - REMINDER_LEAD_HOURS * HOUR)
  return dayBefore > now ? dayBefore : now
}

// When to try again after `attempts` failed attempts (1 → 1 minute, 2 → 5 minutes…)
export const retryTimeFor = (attempts: number, now: Date): Date => {
  const index = Math.min(Math.max(attempts, 1), RETRY_DELAYS_MINUTES.length) - 1
  const delayMinutes = RETRY_DELAYS_MINUTES[index] ?? RETRY_DELAYS_MINUTES[0]
  return new Date(now.getTime() + delayMinutes * MINUTE)
}
