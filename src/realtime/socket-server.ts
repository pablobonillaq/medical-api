import type { Server as HttpServer } from 'node:http'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { ACCESS_TOKEN_COOKIE } from '../modules/auth/auth.constants.js'
import { authService } from '../modules/auth/auth.service.js'
import type { Role } from '../modules/users/users.schema.js'
import { AppError, ForbiddenError, UnauthorizedError } from '../shared/errors/app-error.js'
import { readCookie } from '../shared/utils/cookies.js'
import { STAFF_ROOM, userRoom } from './rooms.js'
import type { AppServer, AppSocket } from './socket.types.js'

const CHAT_ROLES: readonly Role[] = ['patient', 'employee']

// Milliseconds until the JWT expires (it was already verified, so it has an exp claim)
const msUntilExpiry = (token: string) => {
  const payload = jwt.decode(token)
  const exp = typeof payload === 'object' && payload?.exp ? payload.exp : 0
  return exp * 1000 - Date.now()
}

// Same session as the REST API: the httpOnly cookie travels with the handshake request
const authenticateSocket = async (socket: AppSocket) => {
  const token = readCookie(socket.handshake.headers.cookie, ACCESS_TOKEN_COOKIE)
  if (!token) throw new UnauthorizedError()

  const user = await authService.getActiveUser(authService.verifyToken(token))
  if (!CHAT_ROLES.includes(user.role)) {
    throw new ForbiddenError('The chat is only available to patients and front desk staff')
  }

  socket.data.user = user
  // A socket must not outlive its session. unref(): this timer alone does not keep Node.js running.
  const timer = setTimeout(() => socket.disconnect(true), msUntilExpiry(token)).unref()
  socket.on('disconnect', () => clearTimeout(timer))
}

export const createSocketServer = (httpServer: HttpServer): AppServer => {
  const io: AppServer = new Server(httpServer)

  // Runs once per connection, before "connection". next(error) rejects it and the
  // client receives "connect_error" with the message.
  io.use((socket, next) => {
    authenticateSocket(socket).then(
      () => next(),
      (error: unknown) => {
        if (!(error instanceof AppError)) console.error('Socket authentication failed', error)
        next(new Error(error instanceof AppError ? error.message : 'Authentication failed'))
      },
    )
  })

  io.on('connection', (socket) => {
    const { user } = socket.data
    void socket.join(userRoom(user.id))
    if (user.role === 'employee') void socket.join(STAFF_ROOM)
  })

  return io
}
