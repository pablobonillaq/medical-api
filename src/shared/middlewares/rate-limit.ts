import type { RequestHandler } from 'express'
import { rateLimit, type Options } from 'express-rate-limit'
import { getAuthUser } from '../../modules/auth/auth.user.js'

const MINUTE = 60 * 1000

type RateLimitName = 'general' | 'login' | 'register' | 'upload'

// Answers like the rest of the API (429 with { error }) and sends the standard
// RateLimit and RateLimit-Policy headers, which tell the client when to try again
const limiter = (error: string, options: Partial<Options>) =>
  rateLimit({ standardHeaders: 'draft-8', legacyHeaders: false, message: { error }, ...options })

const passThrough: RequestHandler = (_req, _res, next) => {
  next()
}

// Counters live in memory, so they belong to one app instance. With more than one
// instance they would need a shared store (e.g. Redis).
export const createRateLimits = ({
  enabled,
}: {
  enabled: boolean
}): Record<RateLimitName, RequestHandler> => {
  if (!enabled) {
    return { general: passThrough, login: passThrough, register: passThrough, upload: passThrough }
  }

  return {
    // A wide ceiling per IP: stops runaway scripts, not normal use
    general: limiter('Too many requests. Please slow down.', { windowMs: MINUTE, limit: 300 }),
    // Against password guessing: only failed attempts count
    login: limiter('Too many failed sign-in attempts. Try again in 15 minutes.', {
      windowMs: 15 * MINUTE,
      limit: 10,
      skipSuccessfulRequests: true,
    }),
    register: limiter('Too many accounts created from this network. Try again later.', {
      windowMs: 60 * MINUTE,
      limit: 5,
    }),
    // Per user, not per IP: the whole front desk shares one IP. Needs authenticate before it.
    upload: limiter('Too many uploads. Try again later.', {
      windowMs: 60 * MINUTE,
      limit: 30,
      keyGenerator: (req) => getAuthUser(req).id,
    }),
  }
}
