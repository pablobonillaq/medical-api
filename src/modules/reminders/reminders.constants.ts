// The reminder goes out one day before the appointment...
export const REMINDER_LEAD_HOURS = 24
// ...or right away if the appointment is booked later than that, but never for an
// appointment that starts in less than this
export const MIN_REMINDER_LEAD_HOURS = 2

// The worker looks for due reminders this often, and takes at most this many at a time
export const WORKER_INTERVAL_MS = 60_000
export const WORKER_BATCH_SIZE = 20

// While a reminder is being sent, no other worker takes it. If the worker dies halfway,
// the reminder becomes due again after this time.
export const CLAIM_LEASE_MINUTES = 5

// Waiting time after each failed attempt; after the last one the reminder is marked failed
export const RETRY_DELAYS_MINUTES = [1, 5, 15, 60] as const
export const MAX_ATTEMPTS = RETRY_DELAYS_MINUTES.length + 1
