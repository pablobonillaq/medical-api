import type { Prisma } from '../../generated/prisma/client.js'
import { auditRepository } from './audit.repository.js'
import type { AuditContext, AuditEntry } from './audit.types.js'

export const auditService = {
  record: (
    { actor, ip, userAgent }: AuditContext,
    { action, resource, patientId, resourceId, details }: AuditEntry,
    db?: Prisma.TransactionClient,
  ) =>
    auditRepository.create(
      {
        actorId: actor.id,
        actorRole: actor.role,
        action,
        resource,
        patientId,
        resourceId: resourceId ?? null,
        ip,
        userAgent,
        ...(details !== undefined && { details }),
      },
      db,
    ),
}
