import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export const auditRepository = {
  // `db` can be a transaction, so the audit entry is saved (or rolled back) with the change it describes
  create: (data: Prisma.AuditLogUncheckedCreateInput, db: Prisma.TransactionClient = prisma) =>
    db.auditLog.create({ data, select: { id: true } }),
}
