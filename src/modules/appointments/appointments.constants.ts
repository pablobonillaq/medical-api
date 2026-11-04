import type { AppointmentStatus } from '../../generated/prisma/enums.js'

// Appointments in these states take up time in the doctor's agenda
export const ACTIVE_STATUSES = ['scheduled', 'confirmed'] as const

// Candidate start times are generated every 15 minutes
export const SLOT_STEP_MINUTES = 15

// Patients can book up to 90 days ahead
export const MAX_DAYS_AHEAD = 90

// Patients can cancel or reschedule up to 2 hours before the appointment; staff at any time
export const MIN_PATIENT_NOTICE_HOURS = 2

// State machine: which status changes are allowed from each status.
// Cancelling has its own endpoint because it has its own rules (reason, notice).
export const STATUS_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  scheduled: ['confirmed', 'completed', 'no_show', 'cancelled'],
  confirmed: ['completed', 'no_show', 'cancelled'],
  cancelled: [],
  completed: [],
  no_show: [],
}
