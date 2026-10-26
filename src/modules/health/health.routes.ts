import { Router } from 'express'
import { prisma } from '../../db/prisma.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req, res) => {
  let database: 'up' | 'down' = 'up'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch {
    database = 'down'
  }

  res.status(database === 'up' ? 200 : 503).json({
    status: database === 'up' ? 'ok' : 'error',
    database,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  })
})
