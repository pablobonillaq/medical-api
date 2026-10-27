import { z } from 'zod'

export const ROLES = ['admin', 'doctor', 'employee', 'patient'] as const
export const roleSchema = z.enum(ROLES, { error: 'Invalid role' })
export type Role = z.infer<typeof roleSchema>

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
export const createStaffSchema = z.object({
  email,
  password,
  role: roleSchema.exclude(['patient']),
})

export type RegisterPatientInput = z.infer<typeof registerPatientSchema>
export type CreateStaffInput = z.infer<typeof createStaffSchema>
export type LoginInput = z.infer<typeof loginSchema>