import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
  setDoctorServicesSchema,
  updateDoctorSchema,
} from './doctors.schema.js'

export const doctorsPaths: ZodOpenApiPathsObject = {
  '/doctors': {
    get: {
      tags: ['Doctors'],
      summary: 'List doctors',
      description:
        '`serviceId` keeps the doctors who offer that service. ' +
        '`includeInactive=true` also lists disabled doctors (admins only).',
      requestParams: { query: listDoctorsQuerySchema },
      responses: {
        200: { description: 'The doctors with their services' },
        ...errors(400, 401),
      },
    },
    post: {
      tags: ['Doctors'],
      summary: 'Create a doctor (account and profile)',
      description: 'Admins only. The doctor can sign in right away with this email and password.',
      requestBody: jsonBody(createDoctorSchema),
      responses: {
        201: { description: 'The new doctor' },
        ...errors(400, 401, 403, 409),
      },
    },
  },
  '/doctors/{id}': {
    get: {
      tags: ['Doctors'],
      summary: 'Get a doctor',
      requestParams: { path: idParamsSchema },
      responses: {
        200: { description: 'The doctor with their services' },
        ...errors(400, 401, 404),
      },
    },
    patch: {
      tags: ['Doctors'],
      summary: 'Update a doctor profile',
      description: 'Admins only. Send only the fields to change.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(updateDoctorSchema),
      responses: {
        200: { description: 'The updated doctor' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
  '/doctors/{id}/services': {
    put: {
      tags: ['Doctors'],
      summary: 'Replace the services a doctor offers',
      description: 'Admins only. Every service must exist and be active. Repeated ids count once.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(setDoctorServicesSchema),
      responses: {
        200: { description: 'The doctor with the new list of services' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
