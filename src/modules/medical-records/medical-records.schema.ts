import { z } from 'zod'
import { paginationQuerySchema } from '../../shared/schemas/common.js'
import {
  BLOOD_TYPES,
  MAX_AMENDMENT_REASON_LENGTH,
  MAX_HISTORY_TEXT_LENGTH,
  MAX_NOTE_TEXT_LENGTH,
} from './medical-records.constants.js'

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

export const noteParamsSchema = patientIdParamsSchema.extend({
  noteId: z.uuid({ error: 'Invalid note id' }),
})

const noteText = (field: string, max = MAX_NOTE_TEXT_LENGTH) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(1, { error: `${field} cannot be empty` })
    .max(max, { error: `${field} must be at most ${max} characters` })

// SOAP note: Subjective (what the patient reports), Objective (exam findings),
// Assessment (diagnosis) and Plan (treatment and follow-up)
export const createClinicalNoteSchema = z.object({
  appointmentId: z.uuid({ error: 'Invalid appointment id' }).optional(),
  subjective: noteText('subjective'),
  objective: z
    .string({ error: 'objective must be text' })
    .trim()
    .max(MAX_NOTE_TEXT_LENGTH, {
      error: `objective must be at most ${MAX_NOTE_TEXT_LENGTH} characters`,
    })
    .transform((value) => value || null)
    .nullable()
    .default(null),
  assessment: noteText('assessment'),
  plan: noteText('plan'),
})

// An amendment is the full corrected note plus the reason for the correction
export const amendClinicalNoteSchema = createClinicalNoteSchema
  .omit({ appointmentId: true })
  .extend({ reason: noteText('reason', MAX_AMENDMENT_REASON_LENGTH) })

export const listNotesQuerySchema = paginationQuerySchema

export type UpsertMedicalHistoryInput = z.infer<typeof upsertMedicalHistorySchema>
export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>
export type AmendClinicalNoteInput = z.infer<typeof amendClinicalNoteSchema>
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>
