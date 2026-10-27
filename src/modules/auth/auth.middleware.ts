import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import { ACCESS_TOKEN_COOKIE } from './auth.constants.js'
import { authService } from './auth.service.js'

export const authenticate: RequestHandler = (req, _res, next) => {
  const token = (req.cookies as Record<string, unknown>)[ACCESS_TOKEN_COOKIE]
  if (typeof token !== 'string') throw new UnauthorizedError()

  req.user = authService.verifyToken(token)
  next()
}