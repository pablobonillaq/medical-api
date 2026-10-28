import type { PublicUser } from '../modules/users/users.types.js'

declare global {
  namespace Express {
    interface Request {
      user?: PublicUser
    }
  }
}