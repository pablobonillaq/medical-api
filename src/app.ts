import express from 'express'
import { healthRouter } from './modules/health/health.routes.js'
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.js'
import cookieParser from 'cookie-parser'
import { authRouter } from './modules/auth/auth.routes.js'

export const createApp = () => {
  const app = express()

  app.disable('x-powered-by')
  app.use(express.json())
  app.use(cookieParser())

  app.use('/health', healthRouter)
  app.use('/auth', authRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
