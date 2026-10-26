import express from 'express'
import { healthRouter } from './modules/health/health.routes.js'
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json())

  app.use('/health', healthRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
