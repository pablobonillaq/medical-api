import { Router } from 'express'
import { prisma } from '../../db/prisma.js'

// In an object so a test can simulate a database that does not answer
export const healthChecks = {
  database: async () => {
    await prisma.$queryRaw`SELECT 1`
  },
}

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  const databaseUp = await healthChecks.database().then(
    () => true,
    () => false,
  )

  res.status(databaseUp ? 200 : 503).json({
    status: databaseUp ? 'ok' : 'error',
    database: databaseUp ? 'up' : 'down',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})
