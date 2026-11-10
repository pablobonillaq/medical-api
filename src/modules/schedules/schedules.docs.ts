import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import {
  createTimeOffSchema,
  doctorParamsSchema,
  replaceScheduleSchema,
  timeOffParamsSchema,
} from './schedules.schema.js'

export const schedulesPaths: ZodOpenApiPathsObject = {
  '/doctors/{doctorId}/schedule': {
    get: {
      tags: ['Schedules'],
      summary: "Get a doctor's weekly schedule",
      description: 'Times are in the clinic time zone. `dayOfWeek`: 1 is Monday, 7 is Sunday.',
      requestParams: { path: doctorParamsSchema },
      responses: {
        200: { description: 'The working blocks, sorted by day and start time' },
        ...errors(400, 401, 404),
      },
    },
    put: {
      tags: ['Schedules'],
      summary: "Replace a doctor's weekly schedule",
      description:
        'The admin or the doctor themselves. Times use HH:mm in multiples of 5 minutes, ' +
        'and blocks of the same day cannot overlap. An empty list removes the schedule.',
      requestParams: { path: doctorParamsSchema },
      requestBody: jsonBody(replaceScheduleSchema),
      responses: {
        200: { description: 'The new schedule' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/doctors/{doctorId}/time-off': {
    get: {
      tags: ['Schedules'],
      summary: 'List upcoming time off',
      description:
        'The admin, the doctor themselves and the front desk. Past time off is left out.',
      requestParams: { path: doctorParamsSchema },
      responses: {
        200: { description: 'Time off that has not ended yet' },
        ...errors(400, 401, 403, 404),
      },
    },
    post: {
      tags: ['Schedules'],
      summary: 'Add time off',
      description:
        'The admin or the doctor themselves. Dates need a time zone, e.g. 2026-12-24T00:00:00-06:00. ' +
        'Free slots inside it disappear from the availability.',
      requestParams: { path: doctorParamsSchema },
      requestBody: jsonBody(createTimeOffSchema),
      responses: {
        201: { description: 'The new time off' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
  '/doctors/{doctorId}/time-off/{timeOffId}': {
    delete: {
      tags: ['Schedules'],
      summary: 'Remove time off',
      description: 'The admin or the doctor themselves.',
      requestParams: { path: timeOffParamsSchema },
      responses: {
        204: { description: 'Removed' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
