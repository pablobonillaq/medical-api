import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from './appointments.schema.js'

export const appointmentsPaths: ZodOpenApiPathsObject = {
  '/appointments': {
    post: {
      tags: ['Appointments'],
      summary: 'Book an appointment',
      description:
        'Patients, front desk and admins. `startsAt` must be one of the free slots of ' +
        'GET /availability. Patients book for themselves; staff must send `patientId`. ' +
        'The reminder is scheduled with it.',
      requestBody: jsonBody(createAppointmentSchema),
      responses: {
        201: { description: 'The new appointment' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
    get: {
      tags: ['Appointments'],
      summary: 'List appointments',
      description:
        'Staff see every appointment; patients and doctors only their own, whatever filters ' +
        'they send. `from` and `to` filter by start time.',
      requestParams: { query: listAppointmentsQuerySchema },
      responses: {
        200: { description: 'One page of appointments, earliest first' },
        ...errors(400, 401, 404),
      },
    },
  },
  '/appointments/{id}': {
    get: {
      tags: ['Appointments'],
      summary: 'Get an appointment',
      description: 'Staff, or the patient and doctor of the appointment. Other users get 404.',
      requestParams: { path: idParamsSchema },
      responses: {
        200: { description: 'The appointment' },
        ...errors(400, 401, 404),
      },
    },
  },
  '/appointments/{id}/cancel': {
    patch: {
      tags: ['Appointments'],
      summary: 'Cancel an appointment',
      description:
        'Only scheduled or confirmed appointments that have not started. ' +
        'Patients must cancel at least 2 hours before. The body is optional.',
      requestParams: { path: idParamsSchema },
      requestBody: { ...jsonBody(cancelAppointmentSchema), required: false },
      responses: {
        200: { description: 'The cancelled appointment' },
        ...errors(400, 401, 404, 409),
      },
    },
  },
  '/appointments/{id}/reschedule': {
    patch: {
      tags: ['Appointments'],
      summary: 'Move an appointment to another time',
      description:
        'Patients, front desk and admins. Same doctor and service; the new time must be free. ' +
        'The appointment goes back to scheduled and its reminder moves with it.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(rescheduleAppointmentSchema),
      responses: {
        200: { description: 'The rescheduled appointment' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
  '/appointments/{id}/status': {
    patch: {
      tags: ['Appointments'],
      summary: 'Confirm an appointment, or record whether the patient came',
      description:
        '`confirmed`: the patient or staff, before it starts. ' +
        '`completed` or `no_show`: the doctor or staff, once it started. ' +
        'Cancelling has its own endpoint.',
      requestParams: { path: idParamsSchema },
      requestBody: jsonBody(updateAppointmentStatusSchema),
      responses: {
        200: { description: 'The updated appointment' },
        ...errors(400, 401, 403, 404, 409),
      },
    },
  },
}
