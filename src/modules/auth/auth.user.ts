import type { Request } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import type { PublicUser } from '../users/users.types.js'

// The user that authenticate() put on the request. Routes behind authenticate always have
// one; this gives controllers a non-optional type and fails with 401 if a route forgot it.
export const getAuthUser = (req: Request): PublicUser => {
  if (!req.user) throw new UnauthorizedError()
  return req.user
}
