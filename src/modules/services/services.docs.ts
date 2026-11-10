import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
} from './services.schema.js'

export const servicesPaths: ZodOpenApiPathsObject = {
  '/services': {
    get: {
      tags: ['Services'],
      summary: 'List services',
      description: '`includeInactive=true` also lists inactive services (admins only).',
      requestParams: { query: listServicesQuerySchema },
      responses: {
        200: { description: 'The services' },
        ...errors(400, 401),
      },
    },
    post: {
      tags: ['Services'],
      summary: 'Create a service',
      description: 'Admins only. The duration is a multiple of 5 minutes.',
      requestBody: jsonBody(createServiceSchema),
      responses: {
        201: { description: 'The new service' },
        ...errors(400, 401, 403, 409),
      },
    },
  },
  '/services/{id}': {
    get: {
      tags: ['Services'],
      summary: 'Get a service',
      requestParams: { path: idParamsSchema },
      responses: {
        200: { description: 'The service' },
        ...errors(400, 401, 404),
      },
    },
    patch: {
      tags: ['Services'],
      summary: 'Update a service',
      description: 'Admins only. Send only the fields to change; `description: null` removes it.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(updateServiceSchema),
      responses: {
        200: { description: 'The updated service' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
}
