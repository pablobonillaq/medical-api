import bcrypt from 'bcrypt'
import { z } from 'zod'
import { SALT_ROUNDS } from '../modules/auth/auth.constants.js'
import { prisma } from './prisma.js'

const seedEnvSchema = z.object({
  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email({ error: 'ADMIN_EMAIL must be valid' })),
  ADMIN_PASSWORD: z.string().min(12, { error: 'ADMIN_PASSWORD must be at least 12 characters' }),
})

const main = async () => {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = seedEnvSchema.parse(process.env)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS)

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {},
    create: { email: ADMIN_EMAIL, passwordHash, role: 'admin' },
  })

  console.log(`Admin ready: ${admin.email}`)
}

try {
  await main()
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}