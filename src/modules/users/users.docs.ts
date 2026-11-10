import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import {
  createStaffSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from './users.schema.js'

export const usersPaths: ZodOpenApiPathsObject = {
  '/users': {
    post: {
      tags: ['Users'],
      summary: 'Create a staff account (admin or front desk)',
      description:
        'Admins only. Doctors are created from POST /doctors, patients sign up themselves.',
      requestBody: jsonBody(createStaffSchema),
      responses: {
        201: { description: 'The new account, without its password' },
        ...errors(400, 401, 403, 409),
      },
    },
    get: {
      tags: ['Users'],
      summary: 'List accounts',
      description: 'Admins only.',
      requestParams: { query: listUsersQuerySchema },
      responses: {
        200: { description: 'The accounts' },
        ...errors(400, 401, 403),
      },
    },
  },
  '/users/{id}': {
    patch: {
      tags: ['Users'],
      summary: 'Change the role of a staff account, or enable/disable any account',
      description:
        'Admins only, and never on their own account. Disabling an account closes its open chat connections.',
      requestParams: { path: userIdParamsSchema },
      requestBody: jsonBody(updateUserSchema),
      responses: {
        200: { description: 'The updated account' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
