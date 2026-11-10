import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors } from '../../docs/openapi.helpers.js'
import { availabilityQuerySchema } from './appointments.schema.js'

export const availabilityPaths: ZodOpenApiPathsObject = {
  '/availability': {
    get: {
      tags: ['Availability'],
      summary: 'Free times of a doctor for a service on one day',
      description:
        '`date` is a day in the clinic time zone, from today up to 90 days ahead. ' +
        'Start times come every 15 minutes inside the working hours, without time off, ' +
        'other appointments or times that already passed.',
      requestParams: { query: availabilityQuerySchema },
      responses: {
        200: { description: 'The free slots, with their UTC and local start times' },
        ...errors(400, 401, 404),
      },
    },
  },
}
