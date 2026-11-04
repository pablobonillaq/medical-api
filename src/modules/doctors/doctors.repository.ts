import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { omitUndefined } from '../../shared/utils/omit-undefined.js'
import type { UpdateDoctorInput } from './doctors.schema.js'

export const doctorInclude = {
  user: { select: { email: true, active: true } },
  services: {
    select: { service: { select: { id: true, name: true, durationMinutes: true, active: true } } },
    orderBy: { service: { name: 'asc' } },
  },
} satisfies Prisma.DoctorInclude

export type DoctorWithRelations = Prisma.DoctorGetPayload<{ include: typeof doctorInclude }>

interface CreateDoctorData {
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  specialty: string
  licenseNumber: string
}

export const doctorsRepository = {
  findMany: (filters: { serviceId?: string | undefined; includeInactive: boolean }) =>
    prisma.doctor.findMany({
      where: {
        ...(filters.includeInactive ? {} : { user: { active: true } }),
        ...(filters.serviceId ? { services: { some: { serviceId: filters.serviceId } } } : {}),
      },
      include: doctorInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    }),

  findById: (id: string) => prisma.doctor.findUnique({ where: { id }, include: doctorInclude }),

  findByUserId: (userId: string) =>
    prisma.doctor.findUnique({ where: { userId }, select: { id: true } }),

  findByLicenseNumber: (licenseNumber: string) =>
    prisma.doctor.findUnique({ where: { licenseNumber } }),

  // Nested write: Prisma creates the user and the doctor profile in a single transaction
  createWithUser: ({ email, passwordHash, ...profile }: CreateDoctorData) =>
    prisma.doctor.create({
      data: { ...profile, user: { create: { email, passwordHash, role: 'doctor' } } },
      include: doctorInclude,
    }),

  update: (id: string, data: UpdateDoctorInput) =>
    prisma.doctor.update({ where: { id }, data: omitUndefined(data), include: doctorInclude }),

  // Replaces the doctor's services: both operations succeed or neither does
  replaceServices: (doctorId: string, serviceIds: string[]) =>
    prisma.$transaction([
      prisma.doctorService.deleteMany({ where: { doctorId } }),
      prisma.doctorService.createMany({
        data: serviceIds.map((serviceId) => ({ doctorId, serviceId })),
      }),
    ]),
}
