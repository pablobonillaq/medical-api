import { z } from 'zod'
import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { patientIdParamsSchema } from '../medical-records/medical-records.schema.js'
import { ALLOWED_MIME_TYPES } from './attachments.constants.js'
import {
  attachmentParamsSchema,
  listAttachmentsQuerySchema,
  uploadFieldsSchema,
  voidAttachmentSchema,
} from './attachments.schema.js'

// The file goes in the same multipart/form-data request as the text fields
const uploadBodySchema = uploadFieldsSchema.extend({ file: z.file() })

const fileContent = Object.fromEntries(
  ALLOWED_MIME_TYPES.map((type) => [type, { schema: { type: 'string', format: 'binary' } }]),
)

export const attachmentsPaths: ZodOpenApiPathsObject = {
  '/patients/{patientId}/attachments': {
    post: {
      tags: ['Attachments'],
      summary: 'Upload a file to the medical record',
      description:
        'A doctor who treats the patient, the patient, or the front desk. ' +
        'PDF, JPEG, PNG or WebP up to 10 MB; the type is checked from the content, not the name. ' +
        'Only doctors can link `clinicalNoteId`.',
      requestParams: { path: patientIdParamsSchema },
      requestBody: {
        required: true,
        content: { 'multipart/form-data': { schema: uploadBodySchema } },
      },
      responses: {
        201: { description: 'The file record' },
        ...errors(400, 401, 403, 404, 413, 415),
      },
    },
    get: {
      tags: ['Attachments'],
      summary: 'List files',
      description:
        'The patient and the treating doctor see every file; the front desk only the ones it ' +
        'uploaded. `includeVoided=true` also lists voided files (treating doctor only).',
      requestParams: { path: patientIdParamsSchema, query: listAttachmentsQuerySchema },
      responses: {
        200: { description: 'One page of files' },
        ...errors(400, 401, 404),
      },
    },
  },
  '/patients/{patientId}/attachments/{attachmentId}/download': {
    get: {
      tags: ['Attachments'],
      summary: 'Download a file',
      description:
        'The patient or the treating doctor. The front desk can upload but never open files (403). ' +
        'Every download is recorded in the audit log.',
      requestParams: { path: attachmentParamsSchema },
      responses: {
        200: { description: 'The file, as an attachment', content: fileContent },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/patients/{patientId}/attachments/{attachmentId}/review': {
    post: {
      tags: ['Attachments'],
      summary: 'Mark a file as reviewed',
      description: 'The treating doctor, once per file.',
      requestParams: { path: attachmentParamsSchema },
      responses: {
        200: { description: 'The reviewed file' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
  '/patients/{patientId}/attachments/{attachmentId}/void': {
    post: {
      tags: ['Attachments'],
      summary: 'Void a file uploaded by mistake',
      description:
        'The treating doctor. The file is never deleted: it is hidden from the patient and ' +
        'the front desk, and the reason is kept.',
      requestParams: { path: attachmentParamsSchema },
      requestBody: jsonBody(voidAttachmentSchema),
      responses: {
        200: { description: 'The voided file' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
}
