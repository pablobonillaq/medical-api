export const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

// Free-text fields of the medical history (each one is a short summary, not a full note)
export const MEDICAL_HISTORY_TEXT_FIELDS = [
  'allergies',
  'chronicConditions',
  'currentMedications',
  'surgicalHistory',
  'familyHistory',
] as const

export const MAX_HISTORY_TEXT_LENGTH = 2000
// A note can document an appointment that took place or is taking place
export const NOTE_APPOINTMENT_STATUSES = ['scheduled', 'confirmed', 'completed'] as const

export const MAX_NOTE_TEXT_LENGTH = 5000
export const MAX_AMENDMENT_REASON_LENGTH = 500
