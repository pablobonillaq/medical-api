import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { UpsertMedicalHistoryInput } from './medical-records.schema.js'

export const medicalHistoryInclude = {
  updatedBy: { select: { id: true, doctor: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.MedicalHistoryInclude

export type MedicalHistoryWithAuthor = Prisma.MedicalHistoryGetPayload<{
  include: typeof medicalHistoryInclude
}>

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

  findHistory: (patientId: string, db: Prisma.TransactionClient = prisma) =>
    db.medicalHistory.findUnique({ where: { patientId }, include: medicalHistoryInclude }),

  // Creates the history the first time and replaces it afterwards
  upsertHistory: (
    patientId: string,
    data: UpsertMedicalHistoryInput,
    updatedById: string,
    db: Prisma.TransactionClient = prisma,
  ) =>
    db.medicalHistory.upsert({
      where: { patientId },
      create: { ...data, patientId, updatedById },
      update: { ...data, updatedById },
      include: medicalHistoryInclude,
    }),
}
