import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import {
  amendClinicalNoteSchema,
  createClinicalNoteSchema,
  listNotesQuerySchema,
  noteParamsSchema,
  patientIdParamsSchema,
  upsertMedicalHistorySchema,
} from './medical-records.schema.js'

const WHO_CAN_READ =
  'The patient, or a doctor who treats them (an appointment that was not cancelled). ' +
  'Anyone else gets 404, and the attempt is recorded in the audit log.'

export const medicalRecordsPaths: ZodOpenApiPathsObject = {
  '/patients/{patientId}/medical-history': {
    get: {
      tags: ['Medical records'],
      summary: 'Get the medical history',
      description: `${WHO_CAN_READ} \`medicalHistory\` is null until a doctor writes it.`,
      requestParams: { path: patientIdParamsSchema },
      responses: {
        200: { description: 'The medical history, or null' },
        ...errors(400, 401, 404),
      },
    },
    put: {
      tags: ['Medical records'],
      summary: 'Create or replace the medical history',
      description:
        'A doctor who treats the patient. PUT replaces the whole history: ' +
        'missing or empty fields are saved as null.',
      requestParams: { path: patientIdParamsSchema },
      requestBody: jsonBody(upsertMedicalHistorySchema),
      responses: {
        200: { description: 'The saved medical history' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/patients/{patientId}/notes': {
    get: {
      tags: ['Medical records'],
      summary: 'List clinical notes',
      description: `${WHO_CAN_READ} Original notes, newest first, each with its amendments.`,
      requestParams: { path: patientIdParamsSchema, query: listNotesQuerySchema },
      responses: {
        200: { description: 'One page of notes' },
        ...errors(400, 401, 404),
      },
    },
    post: {
      tags: ['Medical records'],
      summary: 'Write a clinical note (SOAP)',
      description:
        'A doctor who treats the patient. `appointmentId` is optional: it must be one of your ' +
        'appointments with this patient, not cancelled or missed, and it can have only one note.',
      requestParams: { path: patientIdParamsSchema },
      requestBody: jsonBody(createClinicalNoteSchema),
      responses: {
        201: { description: 'The new note' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
  '/patients/{patientId}/notes/{noteId}': {
    get: {
      tags: ['Medical records'],
      summary: 'Get a clinical note',
      description: WHO_CAN_READ,
      requestParams: { path: noteParamsSchema },
      responses: {
        200: { description: 'The note with its amendments' },
        ...errors(400, 401, 404),
      },
    },
  },
  '/patients/{patientId}/notes/{noteId}/amendments': {
    post: {
      tags: ['Medical records'],
      summary: 'Correct a clinical note',
      description:
        'Notes are never edited or deleted. The author writes the full corrected note ' +
        'and the reason; the original stays as it was.',
      requestParams: { path: noteParamsSchema },
      requestBody: jsonBody(amendClinicalNoteSchema),
      responses: {
        201: { description: 'The amendment' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
