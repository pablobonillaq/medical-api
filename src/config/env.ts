import { z } from 'zod'

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
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
  console.error('Invalid environment variables:\n' + z.prettifyError(result.error))
  process.exit(1)
}

export const env = result.data
