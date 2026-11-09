import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export const attachmentInclude = {
  uploadedBy: {
    select: { id: true, role: true, doctor: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.AttachmentInclude

export type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: typeof attachmentInclude
}>

export const attachmentsRepository = {
  create: (data: Prisma.AttachmentUncheckedCreateInput, db: Prisma.TransactionClient = prisma) =>
    db.attachment.create({ data, include: attachmentInclude }),

  findById: (patientId: string, attachmentId: string) =>
    prisma.attachment.findFirst({
      where: { id: attachmentId, patientId },
      include: attachmentInclude,
    }),

  // One page (newest first) and the total, read in the same transaction
  findMany: (where: Prisma.AttachmentWhereInput, { skip, take }: { skip: number; take: number }) =>
    prisma.$transaction([
      prisma.attachment.findMany({
        where,
        include: attachmentInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.attachment.count({ where }),
    ]),

  findNoteOfPatient: (clinicalNoteId: string, patientId: string) =>
    prisma.clinicalNote.findFirst({
      where: { id: clinicalNoteId, patientId },
      select: { id: true },
    }),

  // Conditional updates: they only change a row that is still in the expected state, so two
  // doctors reviewing at the same moment cannot both succeed. Returns how many rows changed.
  markReviewed: (id: string, reviewedById: string, db: Prisma.TransactionClient = prisma) =>
    db.attachment.updateMany({
      where: { id, reviewedAt: null, voidedAt: null },
      data: { reviewedById, reviewedAt: new Date() },
    }),

  markVoided: (
    id: string,
    { voidedById, voidReason }: { voidedById: string; voidReason: string },
    db: Prisma.TransactionClient = prisma,
  ) =>
    db.attachment.updateMany({
      where: { id, voidedAt: null },
      data: { voidedById, voidReason, voidedAt: new Date() },
    }),
}
