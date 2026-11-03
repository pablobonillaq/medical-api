import { z } from 'zod'
import { hasAtLeastOneField, personNameSchema } from '../../shared/schemas/common.js'
import { emailSchema, passwordSchema } from '../users/users.schema.js'

const specialty = z
  .string({ error: 'specialty is required' })
  .trim()
  .min(2, { error: 'specialty must be at least 2 characters' })
  .max(100, { error: 'specialty must be at most 100 characters' })

// Cédula profesional (Mexico): 7 or 8 digits
const licenseNumber = z
  .string({ error: 'licenseNumber is required' })
  .trim()
  .regex(/^\d{7,8}$/, { error: 'licenseNumber must have 7 or 8 digits' })

export const createDoctorSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: personNameSchema('firstName'),
  lastName: personNameSchema('lastName'),
  specialty,
  licenseNumber,
})

export const updateDoctorSchema = z
  .object({
    firstName: personNameSchema('firstName').optional(),
    lastName: personNameSchema('lastName').optional(),
    specialty: specialty.optional(),
    licenseNumber: licenseNumber.optional(),
  })
  .refine(hasAtLeastOneField, { error: 'Send at least one field to update' })

export const setDoctorServicesSchema = z.object({
  serviceIds: z
    .array(z.uuid({ error: 'Each service id must be a valid id' }), {
      error: 'serviceIds must be an array',
    })
    .max(50, { error: 'A doctor can offer at most 50 services' })
    .transform((ids) => [...new Set(ids)]),
})

export const listDoctorsQuerySchema = z.object({
  serviceId: z.uuid({ error: 'Invalid service id' }).optional(),
  includeInactive: z.stringbool().optional(),
})

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>
export type ListDoctorsQuery = z.infer<typeof listDoctorsQuerySchema>
