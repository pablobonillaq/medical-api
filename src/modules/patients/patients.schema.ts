import { z } from 'zod'
import {
  hasAtLeastOneField,
  paginationQuerySchema,
  personNameSchema,
} from '../../shared/schemas/common.js'
import { emailSchema, passwordSchema } from '../users/users.schema.js'

// Date only (no time): "1990-05-21" is stored as a PostgreSQL DATE
const birthDate = z.iso
  .date({ error: 'birthDate must use the YYYY-MM-DD format' })
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => date <= new Date(), { error: 'birthDate cannot be in the future' })
  .refine((date) => date.getUTCFullYear() >= 1900, { error: 'birthDate must be after 1900' })

// Mexican phone numbers, stored in E.164 format (+52 and 10 digits), as WhatsApp requires
const phone = z
  .string({ error: 'phone is required' })
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .pipe(
    z
      .string()
      .regex(/^(\+?52)?\d{10}$/, { error: 'phone must be a Mexican number with 10 digits' }),
  )
  .transform((value) => `+52${value.slice(-10)}`)

const whatsappOptIn = z.boolean({ error: 'whatsappOptIn must be true or false' })
// Consent to receive reminders by email; separate from WhatsApp consent
const emailRemindersOptIn = z.boolean({ error: 'emailRemindersOptIn must be true or false' })

export const createPatientSchema = z.object({
  firstName: personNameSchema('firstName'),
  lastName: personNameSchema('lastName'),
  birthDate,
  phone,
  whatsappOptIn: whatsappOptIn.default(false),
  // Optional: if empty, reminders use the email of the patient's account (if any)
  contactEmail: emailSchema.nullable().default(null),
  emailRemindersOptIn: emailRemindersOptIn.default(false),
})

// No defaults here: a missing field must stay undefined so it is not overwritten
export const updatePatientSchema = z
  .object({
    firstName: personNameSchema('firstName').optional(),
    lastName: personNameSchema('lastName').optional(),
    birthDate: birthDate.optional(),
    phone: phone.optional(),
    whatsappOptIn: whatsappOptIn.optional(),
    // null removes the contact email
    contactEmail: emailSchema.nullable().optional(),
    emailRemindersOptIn: emailRemindersOptIn.optional(),
  })
  .refine(hasAtLeastOneField, { error: 'Send at least one field to update' })

export const registerPatientSchema = createPatientSchema.extend({
  email: emailSchema,
  password: passwordSchema,
})

export const listPatientsQuerySchema = paginationQuerySchema.extend({
  search: z
    .string()
    .trim()
    .min(2, { error: 'search must be at least 2 characters' })
    .max(100, { error: 'search must be at most 100 characters' })
    .optional(),
})

export type CreatePatientInput = z.infer<typeof createPatientSchema>
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>
export type RegisterPatientInput = z.infer<typeof registerPatientSchema>
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>
