import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import type { ConversationStatus } from '../../generated/prisma/enums.js'
import type { Role } from '../users/users.schema.js'

export const conversationInclude = {
  patient: { select: { id: true, userId: true, firstName: true, lastName: true } },
} satisfies Prisma.ConversationInclude

export type ConversationWithPatient = Prisma.ConversationGetPayload<{
  include: typeof conversationInclude
}>

export const messageSelect = {
  id: true,
  conversationId: true,
  senderId: true,
  senderRole: true,
  body: true,
  createdAt: true,
} satisfies Prisma.MessageSelect

export type MessageRecord = Prisma.MessageGetPayload<{ select: typeof messageSelect }>

export const chatRepository = {
  findById: (id: string) =>
    prisma.conversation.findUnique({ where: { id }, include: conversationInclude }),

  findByPatientId: (patientId: string) =>
    prisma.conversation.findUnique({ where: { patientId }, include: conversationInclude }),

  // The patient's conversation is created the first time they write
  findOrCreateForPatient: (patientId: string, db: Prisma.TransactionClient = prisma) =>
    db.conversation.upsert({
      where: { patientId },
      create: { patientId },
      update: {},
      include: conversationInclude,
    }),

  // Inbox: one page of conversations, the most recent activity first
  findMany: ({
    status,
    skip,
    take,
  }: {
    status?: ConversationStatus | undefined
    skip: number
    take: number
  }) => {
    const where: Prisma.ConversationWhereInput = status ? { status } : {}
    return prisma.$transaction([
      prisma.conversation.findMany({
        where,
        include: conversationInclude,
        orderBy: [{ lastMessageAt: { sort: 'desc', nulls: 'last' } }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.conversation.count({ where }),
    ])
  },

  // Messages written by the patient after the clinic last read each conversation.
  // Prisma cannot compare two columns of different tables, so this one is plain SQL.
  countUnreadByClinic: async (conversationIds: string[]) => {
    if (conversationIds.length === 0) return new Map<string, number>()
    const rows = await prisma.$queryRaw<{ id: string; unread: number }[]>`
      SELECT c.id, COUNT(m.id)::int AS unread
      FROM conversations c
      LEFT JOIN messages m
        ON m.conversation_id = c.id
        AND m.sender_role = 'patient'
        AND (c.clinic_last_read_at IS NULL OR m.created_at > c.clinic_last_read_at)
      WHERE c.id = ANY(${conversationIds}::uuid[])
      GROUP BY c.id`
    return new Map(rows.map((row) => [row.id, row.unread]))
  },

  // Messages from the clinic the patient has not read yet
  countUnreadByPatient: ({
    id,
    patientLastReadAt,
  }: {
    id: string
    patientLastReadAt: Date | null
  }) =>
    prisma.message.count({
      where: {
        conversationId: id,
        senderRole: 'employee',
        ...(patientLastReadAt && { createdAt: { gt: patientLastReadAt } }),
      },
    }),

  // Newest first, one extra row to know if there are older messages
  findMessages: (
    conversationId: string,
    { before, take }: { before?: string | undefined; take: number },
  ) =>
    prisma.message.findMany({
      where: { conversationId, ...(before && { id: { lt: before } }) },
      select: messageSelect,
      orderBy: { id: 'desc' },
      take,
    }),

  createMessage: (
    data: { conversationId: string; senderId: string; senderRole: Role; body: string },
    db: Prisma.TransactionClient = prisma,
  ) => db.message.create({ data, select: messageSelect }),

  update: (
    id: string,
    data: Prisma.ConversationUpdateInput,
    db: Prisma.TransactionClient = prisma,
  ) => db.conversation.update({ where: { id }, data, include: conversationInclude }),
}
