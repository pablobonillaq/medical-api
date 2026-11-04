// Appointments in these states take up time in the doctor's agenda
export const ACTIVE_STATUSES = ['scheduled', 'confirmed'] as const

// Candidate start times are generated every 15 minutes
export const SLOT_STEP_MINUTES = 15

// Patients can book up to 90 days ahead
export const MAX_DAYS_AHEAD = 90

// Patients can cancel up to 2 hours before the appointment; staff can cancel at any time
export const MIN_CANCEL_NOTICE_HOURS = 2
