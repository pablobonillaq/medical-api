import express from 'express'
import { healthRouter } from './modules/health/health.routes.js'
import { errorHandler, notFoundHandler } from './shared/middlewares/error-handler.js'
import cookieParser from 'cookie-parser'
import { authRouter } from './modules/auth/auth.routes.js'
import { usersRouter } from './modules/users/users.routes.js'
import { servicesRouter } from './modules/services/services.routes.js'
import { doctorsRouter } from './modules/doctors/doctors.routes.js'
import { patientsRouter } from './modules/patients/patients.routes.js'
import { availabilityRouter } from './modules/appointments/availability.routes.js'
import { appointmentsRouter } from './modules/appointments/appointments.routes.js'
import { auditLogsRouter } from './modules/audit/audit.routes.js'
import { chatRouter } from './modules/chat/chat.routes.js'
import { fileURLToPath } from 'node:url'
import { env } from './config/env.js'
import { createDocsRouter } from './docs/docs.routes.js'
import helmet from 'helmet'
import { authenticate } from './modules/auth/auth.middleware.js'
import { createRateLimits } from './shared/middlewares/rate-limit.js'

const isProduction = env.NODE_ENV === 'production'

export const createApp = ({
  serveDemoPages = !isProduction,
  serveDocs = !isProduction,
  rateLimits = env.RATE_LIMIT_ENABLED,
} = {}) => {
  const app = express()
  const limits = createRateLimits({ enabled: rateLimits })

  // With a proxy in front, req.ip is read from X-Forwarded-For (rate limits, audit log)
  app.set('trust proxy', env.TRUST_PROXY)
  // Security headers (it also removes X-Powered-By). upgrade-insecure-requests is left out:
  // HSTS already keeps browsers on HTTPS in production, and it breaks http://localhost.
  app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } } }))
  app.use(express.json())
  app.use(cookieParser())

  app.use('/health', healthRouter)
  app.use(limits.general)
  app.use('/auth/login', limits.login)
  app.use('/auth/register', limits.register)
  // The upload limit counts per user, so the session is checked first
  app.post('/patients/:patientId/attachments', authenticate, limits.upload)
  app.use('/auth', authRouter)
  app.use('/users', usersRouter)
  app.use('/services', servicesRouter)
  app.use('/doctors', doctorsRouter)
  app.use('/patients', patientsRouter)
  app.use('/availability', availabilityRouter)
  app.use('/appointments', appointmentsRouter)
  app.use('/audit-logs', auditLogsRouter)
  app.use('/conversations', chatRouter)

  // Demo pages for manual testing (public/), never served in production
  if (serveDemoPages) {
    app.use('/demo', express.static(fileURLToPath(new URL('../public', import.meta.url))))
  }

  // API documentation (Swagger UI), never served in production
  if (serveDocs) app.use(createDocsRouter())
  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
