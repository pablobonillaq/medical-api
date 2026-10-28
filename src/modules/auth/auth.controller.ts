import type { CookieOptions, RequestHandler } from 'express'
import { env } from '../../config/env.js'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import { loginSchema, registerPatientSchema } from '../users/users.schema.js'
import { ACCESS_TOKEN_COOKIE, TOKEN_TTL_MS } from './auth.constants.js'
import { authService } from './auth.service.js'

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/',
}

const register: RequestHandler = async (req, res) => {
  const input = registerPatientSchema.parse(req.body)
  const user = await authService.registerPatient(input)
  res.status(201).json({ user })
}

const login: RequestHandler = async (req, res) => {
  const input = loginSchema.parse(req.body)
  const { user, token } = await authService.login(input)
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...cookieOptions, maxAge: TOKEN_TTL_MS }).json({ user })
}

const logout: RequestHandler = (_req, res) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE, cookieOptions).status(204).end()
}

const me: RequestHandler = (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  res.json({ user: req.user })
}

export const authController = { register, login, logout, me }