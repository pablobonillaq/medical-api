import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { ACTIVE_STATUSES } from './appointments.constants.js'

export const appointmentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, phone: true, userId: true } },
  doctor: { select: { id: true, firstName: true, lastName: true, specialty: true, userId: true } },
  service: { select: { id: true, name: true, durationMinutes: true } },
} satisfies Prisma.AppointmentInclude

export type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude
}>

interface CreateAppointmentData {
  patientId: string
  doctorId: string
  serviceId: string
  startsAt: Date
  endsAt: Date
  notes: string | null
  createdById: string
}

export const appointmentsRepository = {
  // Active appointments of a doctor that overlap the [from, to) range
  findActiveForDoctorBetween: (doctorId: string, from: Date, to: Date) =>
    prisma.appointment.findMany({
      where: {
        doctorId,
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
      select: { startsAt: true, endsAt: true },
    }),

  // An active appointment of the patient (with any doctor) that overlaps the [from, to) range
  findActiveForPatientBetween: (patientId: string, from: Date, to: Date) =>
    prisma.appointment.findFirst({
      where: {
        patientId,
        status: { in: [...ACTIVE_STATUSES] },
        startsAt: { lt: to },
        endsAt: { gt: from },
      },
    }),

  findById: (id: string) =>
    prisma.appointment.findUnique({ where: { id }, include: appointmentInclude }),

  findMany: ({
    where,
    skip,
    take,
  }: {
    where: Prisma.AppointmentWhereInput
    skip: number
    take: number
  }) =>
    prisma.$transaction([
      prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { startsAt: 'asc' },
        skip,
        take,
      }),
      prisma.appointment.count({ where }),
    ]),

  create: (data: CreateAppointmentData) =>
    prisma.appointment.create({ data, include: appointmentInclude }),

  cancel: (id: string, reason: string | null) =>
    prisma.appointment.update({
      where: { id },
      data: { status: 'cancelled', cancelledAt: new Date(), cancellationReason: reason },
      include: appointmentInclude,
    }),
}
