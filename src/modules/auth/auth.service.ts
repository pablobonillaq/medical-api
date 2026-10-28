import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { env } from '../../config/env.js'
import { ConflictError, ForbiddenError, UnauthorizedError } from '../../shared/errors/app-error.js'
import { usersRepository } from '../users/users.repository.js'
   import type { LoginInput, RegisterPatientInput } from '../users/users.schema.js'
import { toPublicUser } from '../users/users.types.js'
import { SALT_ROUNDS, TOKEN_TTL } from './auth.constants.js'

const tokenPayloadSchema = z.object({ sub: z.uuid() })

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

    const token = jwt.sign({}, env.JWT_SECRET, { subject: user.id, expiresIn: TOKEN_TTL })
    return { user: toPublicUser(user), token }
  },

     verifyToken(token: string): string {
     try {
       const payload = tokenPayloadSchema.parse(jwt.verify(token, env.JWT_SECRET))
       return payload.sub
     } catch {
       throw new UnauthorizedError('Invalid or expired session')
     }
   },

  async getActiveUser(id: string) {
    const user = await usersRepository.findById(id)
    if (!user?.active) throw new UnauthorizedError('Invalid or expired session')
    return toPublicUser(user)
  },
}