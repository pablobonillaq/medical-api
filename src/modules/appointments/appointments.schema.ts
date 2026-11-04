import { z } from 'zod'
import { AppointmentStatus } from '../../generated/prisma/enums.js'
import { isoDateTimeSchema, paginationQuerySchema } from '../../shared/schemas/common.js'

export const availabilityQuerySchema = z.object({
  doctorId: z.uuid({ error: 'Invalid doctor id' }),
  serviceId: z.uuid({ error: 'Invalid service id' }),
  date: z.iso.date({ error: 'date must use the YYYY-MM-DD format' }),
})

export const createAppointmentSchema = z.object({
  doctorId: z.uuid({ error: 'Invalid doctor id' }),
  serviceId: z.uuid({ error: 'Invalid service id' }),
  startsAt: isoDateTimeSchema,
  // Required when staff book for a patient; patients always book for themselves
  patientId: z.uuid({ error: 'Invalid patient id' }).optional(),
  notes: z.string().trim().max(500, { error: 'notes must be at most 500 characters' }).optional(),
})

export const listAppointmentsQuerySchema = paginationQuerySchema.extend({
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional(),
  status: z.enum(AppointmentStatus, { error: 'Invalid status' }).optional(),
  doctorId: z.uuid({ error: 'Invalid doctor id' }).optional(),
  patientId: z.uuid({ error: 'Invalid patient id' }).optional(),
})

export const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, { error: 'reason must be at least 3 characters' })
    .max(300, { error: 'reason must be at most 300 characters' })
    .optional(),
})

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>
