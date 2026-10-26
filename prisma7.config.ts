import { defineConfig } from 'prisma/config'

try {
  process.loadEnvFile()
} catch {
  /* variables del sistema */
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_URL'] },
})