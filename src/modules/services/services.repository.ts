import { prisma } from '../../db/prisma.js'
import { omitUndefined } from '../../shared/utils/omit-undefined.js'
import type { CreateServiceInput, UpdateServiceInput } from './services.schema.js'

export const servicesRepository = {
  findMany: ({ includeInactive }: { includeInactive: boolean }) =>
    prisma.service.findMany({
      where: includeInactive ? {} : { active: true },
      orderBy: { name: 'asc' },
    }),

  findById: (id: string) => prisma.service.findUnique({ where: { id } }),

  create: ({ name, description, durationMinutes }: CreateServiceInput) =>
    prisma.service.create({
      data: { name, description: description ?? null, durationMinutes },
    }),

  update: (id: string, data: UpdateServiceInput) =>
    prisma.service.update({ where: { id }, data: omitUndefined(data) }),
}