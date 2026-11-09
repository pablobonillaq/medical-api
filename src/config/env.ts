import { z } from 'zod'
import path from 'node:path'

try {
  process.loadEnvFile()
} catch {
  /* empty */
}

const isValidTimeZone = (timeZone: string) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone })
    return true
  } catch {
    return false
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url({
    protocol: /^postgres(ql)?$/,
    error: 'DATABASE_URL must be a PostgreSQL URL',
  }),
  JWT_SECRET: z.string().min(32, { error: 'JWT_SECRET must be at least 32 characters' }),
  CLINIC_TIMEZONE: z
    .string()
    .default('America/Mexico_City')
    .refine(isValidTimeZone, { error: 'CLINIC_TIMEZONE must be a valid IANA time zone' }),
  UPLOADS_DIR: z
    .string()
    .min(1)
    .default('storage/uploads')
    .transform((dir) => path.resolve(dir)),
  // Name shown in messages to patients
  CLINIC_NAME: z.string().min(1).default('Clínica'),
  // Outgoing email. The defaults point to Mailpit (compose.yaml), which sends nothing out.
  SMTP_HOST: z.string().min(1).default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(3).default('Clínica <no-reply@clinica.test>'),
  // Turns off the background worker that sends reminders (e.g. in a second API instance)
  REMINDERS_ENABLED: z.stringbool().default(true),
})

const result = envSchema
  .refine((vars) => (vars.SMTP_USER === undefined) === (vars.SMTP_PASSWORD === undefined), {
    error: 'Set both SMTP_USER and SMTP_PASSWORD, or neither',
    path: ['SMTP_PASSWORD'],
  })
  .safeParse(process.env)

if (!result.success) {
  console.error('Invalid environment variables:\n' + z.prettifyError(result.error))
  process.exit(1)
}

export const env = result.data
