import { prisma } from '../../db/prisma.js'
import type { Role } from './users.schema.js'

export const usersRepository = {
  findByEmail: (email: string) => prisma.user.findUnique({ where: { email } }),

  findById: (id: string) => prisma.user.findUnique({ where: { id } }),

  findMany: (filters: { role?: Role | undefined }) =>
    prisma.user.findMany({
      where: filters.role ? { role: filters.role } : {},
      orderBy: { createdAt: 'desc' },
    }),

  create: (data: { email: string; passwordHash: string; role: Role }) =>
    prisma.user.create({ data }),

  update: (id: string, data: { role?: Role | undefined; active?: boolean | undefined }) =>
    prisma.user.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.active !== undefined && { active: data.active }),
      },
    }),
}