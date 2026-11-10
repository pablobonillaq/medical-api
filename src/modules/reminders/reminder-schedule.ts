import {
  MIN_REMINDER_LEAD_HOURS,
  REMINDER_LEAD_HOURS,
  RETRY_DELAYS_MINUTES,
} from './reminders.constants.js'

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000
const LONGEST_RETRY_DELAY_MINUTES = Math.max(...RETRY_DELAYS_MINUTES)

// When the "day before" reminder of an appointment should be sent, or null if it is too late
export const reminderTimeFor = (startsAt: Date, now: Date): Date | null => {
  if (startsAt.getTime() - now.getTime() < MIN_REMINDER_LEAD_HOURS * HOUR) return null
  const dayBefore = new Date(startsAt.getTime() - REMINDER_LEAD_HOURS * HOUR)
  return dayBefore > now ? dayBefore : now
}

// When to try again after `attempts` failed attempts (1 → 1 minute, 2 → 5 minutes…).
// After the last delay of the list, it keeps waiting the longest one.
export const retryTimeFor = (attempts: number, now: Date): Date => {
  const delayMinutes =
    RETRY_DELAYS_MINUTES[Math.max(attempts, 1) - 1] ?? LONGEST_RETRY_DELAY_MINUTES
  return new Date(now.getTime() + delayMinutes * MINUTE)
}
