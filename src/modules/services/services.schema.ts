import { z } from 'zod'
import { hasAtLeastOneField } from '../../shared/schemas/common.js'

const name = z
  .string({ error: 'Name is required' })
  .trim()
  .min(2, { error: 'Name must be at least 2 characters' })
  .max(100, { error: 'Name must be at most 100 characters' })

const description = z
  .string()
  .trim()
  .max(500, { error: 'Description must be at most 500 characters' })

const durationMinutes = z
  .number({ error: 'durationMinutes must be a number' })
  .int()
  .min(5, { error: 'A service must last at least 5 minutes' })
  .max(480, { error: 'A service can last at most 480 minutes' })
  .multipleOf(5, { error: 'durationMinutes must be a multiple of 5' })

export const createServiceSchema = z.object({
  name,
  description: description.optional(),
  durationMinutes,
})

export const updateServiceSchema = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    durationMinutes: durationMinutes.optional(),
    active: z.boolean({ error: 'active must be true or false' }).optional(),
  })
  .refine(hasAtLeastOneField, { error: 'Send at least one field to update' })

export const listServicesQuerySchema = z.object({
  includeInactive: z.stringbool().optional(),
})

export type CreateServiceInput = z.infer<typeof createServiceSchema>
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>