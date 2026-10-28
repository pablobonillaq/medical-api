import { z } from 'zod'

export const ROLES = ['admin', 'doctor', 'employee', 'patient'] as const
export const roleSchema = z.enum(ROLES, { error: 'Invalid role' })
export type Role = z.infer<typeof roleSchema>

const staffRoleSchema = roleSchema.exclude(['patient'])

const email = z
  .string({ error: 'Email is required' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'Email must be valid' }))

const password = z
  .string({ error: 'Password is required' })
  .min(8, { error: 'Password must be at least 8 characters' })
  .max(72, { error: 'Password must be at most 72 characters' })

export const registerPatientSchema = z.object({ email, password })
export const loginSchema = z.object({ email, password })
export const createStaffSchema = z.object({ email, password, role: staffRoleSchema })

export const listUsersQuerySchema = z.object({ role: roleSchema.optional() })

export const updateUserSchema = z
  .object({
    role: staffRoleSchema.optional(),
    active: z.boolean({ error: 'active must be true or false' }).optional(),
  })
  .refine((data) => data.role !== undefined || data.active !== undefined, {
    error: 'Send at least one field: role or active',
  })

export const userIdParamsSchema = z.object({ id: z.uuid({ error: 'Invalid user id' }) })

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>