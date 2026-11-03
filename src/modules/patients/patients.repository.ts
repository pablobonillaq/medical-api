import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { omitUndefined } from '../../shared/utils/omit-undefined.js'
import type { CreatePatientInput, UpdatePatientInput } from './patients.schema.js'

export const patientInclude = {
  user: { select: { email: true, active: true } },
} satisfies Prisma.PatientInclude

export type PatientWithUser = Prisma.PatientGetPayload<{ include: typeof patientInclude }>

// "ana garay" matches first or last name word by word; 4+ digits also search the phone
const searchWhere = (search?: string): Prisma.PatientWhereInput => {
  if (!search) return {}

  const terms = search.split(/\s+/).filter(Boolean)
  const digits = search.replace(/\D/g, '')

  return {
    OR: [
      {
        AND: terms.map((term) => ({
          OR: [
            { firstName: { contains: term, mode: 'insensitive' } },
            { lastName: { contains: term, mode: 'insensitive' } },
          ],
        })),
      },
      ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
    ],
  }
}

export const patientsRepository = {
  findById: (id: string) => prisma.patient.findUnique({ where: { id }, include: patientInclude }),

  findByUserId: (userId: string) =>
    prisma.patient.findUnique({ where: { userId }, include: patientInclude }),

  // Returns one page of patients and the total count, read in the same transaction
  findMany: ({
    search,
    skip,
    take,
  }: {
    search?: string | undefined
    skip: number
    take: number
  }) => {
    const where = searchWhere(search)
    return prisma.$transaction([
      prisma.patient.findMany({
        where,
        include: patientInclude,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        skip,
        take,
      }),
      prisma.patient.count({ where }),
    ])
  },

  create: (data: CreatePatientInput) => prisma.patient.create({ data, include: patientInclude }),

  // Nested write: creates the user account and the patient profile in one transaction
  createWithUser: ({
    email,
    passwordHash,
    ...profile
  }: CreatePatientInput & { email: string; passwordHash: string }) =>
    prisma.patient.create({
      data: { ...profile, user: { create: { email, passwordHash, role: 'patient' } } },
      include: patientInclude,
    }),

  update: (id: string, data: UpdatePatientInput) =>
    prisma.patient.update({ where: { id }, data: omitUndefined(data), include: patientInclude }),
}
