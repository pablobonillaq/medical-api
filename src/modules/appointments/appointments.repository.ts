import { prisma } from '../../db/prisma.js'
import { ACTIVE_STATUSES } from './appointments.constants.js'

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
}
