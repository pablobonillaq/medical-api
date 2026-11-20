import type { RequestHandler } from 'express'
import { ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js'
import type { Role } from '../users/users.schema.js'
import { ACCESS_TOKEN_COOKIE } from './auth.constants.js'
import { authService } from './auth.service.js'
import { getAuthUser } from './auth.user.js'

export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = (req.cookies as Record<string, unknown>)[ACCESS_TOKEN_COOKIE]
  if (typeof token !== 'string') throw new UnauthorizedError()

  const { userId } = authService.verifyToken(token)
  req.user = await authService.getActiveUser(userId)
  next()
}

export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!roles.includes(getAuthUser(req).role)) throw new ForbiddenError()
    next()
  }

// For routes anyone can see, like the clinic's services and doctors. Without the cookie the
// request goes on as a visitor (no req.user); with it, the session must be valid, as in
// authenticate, so an expired or forged token is never treated as a visitor by mistake
export const optionalAuthenticate: RequestHandler = async (req, res, next) => {
  const token = (req.cookies as Record<string, unknown>)[ACCESS_TOKEN_COOKIE]
  if (token === undefined) {
    next()
    return
  }
  await authenticate(req, res, next)
}
