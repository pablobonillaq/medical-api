import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'

const app = createApp()

const server = app.listen(env.PORT, (error) => {
  if (error) throw error
  console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`)
})

const shutdown = async () => {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())