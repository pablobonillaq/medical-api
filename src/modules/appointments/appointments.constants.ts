// Appointments in these states take up time in the doctor's agenda
export const ACTIVE_STATUSES = ['scheduled', 'confirmed'] as const

// Candidate start times are generated every 15 minutes
export const SLOT_STEP_MINUTES = 15

// Patients can book up to 90 days ahead
export const MAX_DAYS_AHEAD = 90
