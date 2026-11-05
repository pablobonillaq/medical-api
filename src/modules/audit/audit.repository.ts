import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

const auditLogInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      role: true,
      doctor: { select: { firstName: true, lastName: true } },
    },
  },
} satisfies Prisma.AuditLogInclude

export type AuditLogWithActor = Prisma.AuditLogGetPayload<{ include: typeof auditLogInclude }>

export const auditRepository = {
  // `db` can be a transaction, so the audit entry is saved (or rolled back) with the change it describes
  create: (data: Prisma.AuditLogUncheckedCreateInput, db: Prisma.TransactionClient = prisma) =>
    db.auditLog.create({ data, select: { id: true } }),

  // One page of entries (newest first) and the total, read in the same transaction
  findMany: (where: Prisma.AuditLogWhereInput, { skip, take }: { skip: number; take: number }) =>
    prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        include: auditLogInclude,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]),
}
