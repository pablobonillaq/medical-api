import { z } from 'zod'

try {
    process.loadEnvFile()
} catch { /* empty */ }

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
})

const result = envSchema.safeParse(process.env)

if (!result.success) {
    console.error('Invalid environment variables:\n' + z.prettifyError(result.error))
    process.exit(1)
}

export const env = result.data