import { prisma } from '../../db/prisma.js'
import type { Role } from './users.schema.js'

export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  create: (data: { email: string; passwordHash: string; role: Role }) =>
    prisma.user.create({ data }),
}