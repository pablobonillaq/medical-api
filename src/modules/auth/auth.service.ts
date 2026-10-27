import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js'
import { usersRepository } from '../users/users.repository.js'
import { roleSchema, type LoginInput, type RegisterPatientInput, type Role } from '../users/users.schema.js'
import { toPublicUser } from '../users/users.types.js'
import { SALT_ROUNDS, TOKEN_TTL } from './auth.constants.js'

export interface AuthUser {
  id: string
  role: Role
}

const tokenPayloadSchema = z.object({ sub: z.uuid(), role: roleSchema })

export const authService = {
  async registerPatient({ email, password }: RegisterPatientInput) {
    const existing = await usersRepository.findByEmail(email)
    if (existing) throw new ConflictError('Email is already registered')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await usersRepository.create({ email, passwordHash, role: 'patient' })
    return toPublicUser(user)
  },

  async login({ email, password }: LoginInput) {
    const user = await usersRepository.findByEmail(email)
    const isValid = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !isValid) throw new UnauthorizedError('Invalid email or password')
    if (!user.active) throw new ForbiddenError('Account is disabled')

    const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
      subject: user.id,
      expiresIn: TOKEN_TTL,
    })
    return { user: toPublicUser(user), token }
  },

  verifyToken(token: string): AuthUser {
    try {
      const payload = tokenPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET))
      return { id: payload.sub, role: payload.role }
    } catch {
      throw new UnauthorizedError('Invalid or expired session')
    }
  },

  async getCurrentUser(id: string) {
    const user = await usersRepository.findById(id)
    if (!user?.active) throw new UnauthorizedError('Invalid or expired session')
    return toPublicUser(user)
  },
}