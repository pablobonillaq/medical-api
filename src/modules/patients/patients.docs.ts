import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './patients.schema.js'

export const patientsPaths: ZodOpenApiPathsObject = {
  '/patients/me': {
    get: {
      tags: ['Patients'],
      summary: 'My patient profile',
      description: 'Patients only.',
      responses: {
        200: { description: 'The patient profile of the signed-in user' },
        ...errors(401, 403, 404),
      },
    },
  },
  '/patients': {
    get: {
      tags: ['Patients'],
      summary: 'Search patients',
      description:
        'Admins and front desk. `search` matches first and last names word by word; ' +
        '4 or more digits also search the phone.',
      requestParams: { query: listPatientsQuerySchema },
      responses: {
        200: { description: 'One page of patients' },
        ...errors(400, 401, 403),
      },
    },
    post: {
      tags: ['Patients'],
      summary: 'Register a walk-in patient (no account)',
      description: 'Admins and front desk. The patient can be booked right away.',
      requestBody: jsonBody(createPatientSchema),
      responses: {
        201: { description: 'The new patient' },
        ...errors(400, 401, 403),
      },
    },
  },
  '/patients/{id}': {
    get: {
      tags: ['Patients'],
      summary: 'Get a patient',
      description: 'Admins, front desk, or the patient themselves. Other users get 404.',
      requestParams: { path: idParamsSchema },
      responses: {
        200: { description: 'The patient' },
        ...errors(400, 401, 404),
      },
    },
    patch: {
      tags: ['Patients'],
      summary: 'Update a patient',
      description:
        'Front desk or the patient themselves; admins cannot edit patient data. ' +
        'Send only the fields to change; `contactEmail: null` removes it.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(updatePatientSchema),
      responses: {
        200: { description: 'The updated patient' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
