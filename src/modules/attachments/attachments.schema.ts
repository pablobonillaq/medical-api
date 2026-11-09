import { z } from 'zod'
import { AttachmentCategory } from '../../generated/prisma/enums.js'
import { paginationQuerySchema } from '../../shared/schemas/common.js'

export const attachmentParamsSchema = z.object({
  patientId: z.uuid({ error: 'Invalid patient id' }),
  attachmentId: z.uuid({ error: 'Invalid attachment id' }),
})

// Text fields sent with the file in the same multipart/form-data request
export const uploadFieldsSchema = z.object({
  category: z
    .enum(AttachmentCategory, {
      error: `category must be one of: ${Object.values(AttachmentCategory).join(', ')}`,
    })
    .default('other'),
  description: z
    .string()
    .trim()
    .max(500, { error: 'description must be at most 500 characters' })
    .transform((value) => value || undefined)
    .optional(),
  // Only doctors can link a file to one of the patient's clinical notes
  clinicalNoteId: z.uuid({ error: 'Invalid clinical note id' }).optional(),
})

export const listAttachmentsQuerySchema = paginationQuerySchema.extend({
  // Voided files are hidden unless the treating doctor asks for them
  includeVoided: z.stringbool({ error: 'includeVoided must be true or false' }).default(false),
})

export const voidAttachmentSchema = z.object({
  reason: z
    .string({ error: 'reason is required' })
    .trim()
    .min(3, { error: 'reason must be at least 3 characters' })
    .max(500, { error: 'reason must be at most 500 characters' }),
})

export type UploadFields = z.infer<typeof uploadFieldsSchema>
export type ListAttachmentsQuery = z.infer<typeof listAttachmentsQuerySchema>
export type VoidAttachmentInput = z.infer<typeof voidAttachmentSchema>
