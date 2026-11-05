import { prisma } from '../../db/prisma.js'

export const medicalRecordsRepository = {
  findPatientOwner: (patientId: string) =>
    prisma.patient.findUnique({ where: { id: patientId }, select: { id: true, userId: true } }),

  // A doctor treats a patient if they have at least one appointment that was not cancelled
  hasCareRelationship: async (doctorId: string, patientId: string) => {
    const appointment = await prisma.appointment.findFirst({
      where: { doctorId, patientId, status: { not: 'cancelled' } },
      select: { id: true },
    })
    return appointment !== null
  },
}
