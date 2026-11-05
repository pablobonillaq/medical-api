import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { UpsertMedicalHistoryInput } from './medical-records.schema.js'

export const medicalHistoryInclude = {
  updatedBy: { select: { id: true, doctor: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.MedicalHistoryInclude

export type MedicalHistoryWithAuthor = Prisma.MedicalHistoryGetPayload<{
  include: typeof medicalHistoryInclude
}>

const noteInclude = {
  doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
} satisfies Prisma.ClinicalNoteInclude

// An original note with its amendments, oldest amendment first
export const noteWithAmendmentsInclude = {
  ...noteInclude,
  amendments: { include: noteInclude, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ClinicalNoteInclude

export type ClinicalNoteWithDoctor = Prisma.ClinicalNoteGetPayload<{ include: typeof noteInclude }>
export type ClinicalNoteWithAmendments = Prisma.ClinicalNoteGetPayload<{
  include: typeof noteWithAmendmentsInclude
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

  // One page of original notes (newest first) and the total, read in the same transaction
  findNotes: (patientId: string, { skip, take }: { skip: number; take: number }) => {
    const where = { patientId, amendsNoteId: null }
    return prisma.$transaction([
      prisma.clinicalNote.findMany({
        where,
        include: noteWithAmendmentsInclude,
        // uuid v7 ids grow with time, so they break ties between notes saved in the same millisecond
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.clinicalNote.count({ where }),
    ])
  },

  findNote: (patientId: string, noteId: string) =>
    prisma.clinicalNote.findFirst({
      where: { id: noteId, patientId },
      include: noteWithAmendmentsInclude,
    }),

  findAppointment: (appointmentId: string) =>
    prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { doctorId: true, patientId: true, status: true },
    }),

  noteExistsForAppointment: async (appointmentId: string) =>
    (await prisma.clinicalNote.findUnique({ where: { appointmentId }, select: { id: true } })) !==
    null,

  createNote: (
    data: Prisma.ClinicalNoteUncheckedCreateInput,
    db: Prisma.TransactionClient = prisma,
  ) => db.clinicalNote.create({ data, include: noteWithAmendmentsInclude }),
}
