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
  // How many proxies (load balancer, Nginx) are in front of the API. 0: clients reach it directly.
  // Decides which IP is the client's, for the rate limits and the audit log.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  // Limits requests per IP and per user. Only the test runs turn it off (vitest.config.ts).
  RATE_LIMIT_ENABLED: z.stringbool().default(true),
})

// Throws with every problem listed. At startup that stops the API before it serves anything.
export const parseEnv = (vars: NodeJS.ProcessEnv) => {
  const result = envSchema
    .refine((data) => (data.SMTP_USER === undefined) === (data.SMTP_PASSWORD === undefined), {
      error: 'Set both SMTP_USER and SMTP_PASSWORD, or neither',
      path: ['SMTP_PASSWORD'],
    })
    .safeParse(vars)
  if (!result.success) {
    throw new Error('Invalid environment variables:\n' + z.prettifyError(result.error))
  }
  return result.data
}

export const env = parseEnv(process.env)
