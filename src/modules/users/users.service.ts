import bcrypt from 'bcrypt'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error.js'
import { SALT_ROUNDS } from '../auth/auth.constants.js'
import { usersRepository } from './users.repository.js'
import type { CreateStaffInput, ListUsersQuery, UpdateUserInput } from './users.schema.js'
import { toPublicUser } from './users.types.js'
import { appEvents } from '../../shared/events.js'

export const usersService = {
  async createStaff({ email, password, role }: CreateStaffInput) {
    const existing = await usersRepository.findByEmail(email)
    if (existing) throw new ConflictError('Email is already registered')

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await usersRepository.create({ email, passwordHash, role })
    return toPublicUser(user)
  },

  async list(query: ListUsersQuery) {
    const users = await usersRepository.findMany(query)
    return users.map(toPublicUser)
  },

  async update(actorId: string, id: string, input: UpdateUserInput) {
    if (actorId === id) throw new ForbiddenError('You cannot modify your own account')

    const user = await usersRepository.findById(id)
    if (!user) throw new NotFoundError('User not found')
    if (input.role && (user.role === 'patient' || user.role === 'doctor')) {
      throw new BadRequestError('The role of patient and doctor accounts cannot be changed')
    }

    const updated = await usersRepository.update(id, input)
    if (updated.active !== user.active || updated.role !== user.role) {
      appEvents.emit('user:access-changed', { userId: id })
    }
    return toPublicUser(updated)
  },
}
