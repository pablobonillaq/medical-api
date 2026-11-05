import { z } from 'zod'
import { BLOOD_TYPES, MAX_HISTORY_TEXT_LENGTH } from './medical-records.constants.js'

export const patientIdParamsSchema = z.object({
  patientId: z.uuid({ error: 'Invalid patient id' }),
})

// Empty text is stored as null. A missing field also becomes null: PUT replaces the whole history.
const historyText = (field: string) =>
  z
    .string({ error: `${field} must be text` })
    .trim()
    .max(MAX_HISTORY_TEXT_LENGTH, {
      error: `${field} must be at most ${MAX_HISTORY_TEXT_LENGTH} characters`,
    })
    .transform((value) => value || null)
    .nullable()
    .default(null)

export const upsertMedicalHistorySchema = z.object({
  bloodType: z
    .enum(BLOOD_TYPES, { error: `bloodType must be one of: ${BLOOD_TYPES.join(', ')}` })
    .nullable()
    .default(null),
  allergies: historyText('allergies'),
  chronicConditions: historyText('chronicConditions'),
  currentMedications: historyText('currentMedications'),
  surgicalHistory: historyText('surgicalHistory'),
  familyHistory: historyText('familyHistory'),
})

export type UpsertMedicalHistoryInput = z.infer<typeof upsertMedicalHistorySchema>
