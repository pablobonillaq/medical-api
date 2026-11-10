import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { registerPatientSchema } from '../patients/patients.schema.js'
import { loginSchema } from '../users/users.schema.js'

export const authPaths: ZodOpenApiPathsObject = {
  '/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Create a patient account',
      description:
        'Creates the account and the patient profile in one request. ' +
        'The phone is saved in E.164 format (+52 and 10 digits). Staff accounts are created from /users.',
      security: [],
      requestBody: jsonBody(registerPatientSchema),
      responses: {
        201: { description: 'The new patient profile' },
        ...errors(400, 409),
      },
    },
  },
  '/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Sign in',
      description:
        'Saves the session in an httpOnly cookie that lasts 1 hour. ' +
        'Wrong email and wrong password get the same 401 message.',
      security: [],
      requestBody: jsonBody(loginSchema),
      responses: {
        200: { description: 'The signed-in user. The response sets the session cookie.' },
        ...errors(400, 401),
        403: { description: 'The account is disabled' },
      },
    },
  },
  '/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Sign out',
      description: 'Removes the session cookie. Works even without a session.',
      security: [],
      responses: { 204: { description: 'Signed out' } },
    },
  },
  '/auth/me': {
    get: {
      tags: ['Auth'],
      summary: 'Who is signed in',
      responses: {
        200: { description: 'The signed-in user' },
        ...errors(401),
      },
    },
  },
}
