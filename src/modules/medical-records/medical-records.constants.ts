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
