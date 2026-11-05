import type { Prisma } from '../../generated/prisma/client.js'
import { NotFoundError } from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import { patientsRepository } from '../patients/patients.repository.js'
import type { PublicUser } from '../users/users.types.js'
import { auditRepository } from './audit.repository.js'
import type { AccessLogQuery, ListAuditLogsQuery } from './audit.schema.js'
import {
  toAccessLogResponse,
  toAuditLogResponse,
  type AuditContext,
  type AuditEntry,
} from './audit.types.js'

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

  async list({
    page,
    pageSize,
    patientId,
    actorId,
    action,
    resource,
    from,
    to,
  }: ListAuditLogsQuery) {
    const where: Prisma.AuditLogWhereInput = {
      ...(patientId && { patientId }),
      ...(actorId && { actorId }),
      ...(action && { action }),
      ...(resource && { resource }),
      ...((from ?? to) && {
        createdAt: { ...(from && { gte: from }), ...(to && { lt: to }) },
      }),
    }
    const [entries, total] = await auditRepository.findMany(where, toSkipTake({ page, pageSize }))
    return { entries: entries.map(toAuditLogResponse), page, pageSize, total }
  },

  // Who opened the patient's record, leaving out the patient's own visits
  async listMyAccessLog(user: PublicUser, { page, pageSize }: AccessLogQuery) {
    const patient = await patientsRepository.findByUserId(user.id)
    if (!patient) throw new NotFoundError('Patient profile not found')

    const [entries, total] = await auditRepository.findMany(
      { patientId: patient.id, actorId: { not: user.id } },
      toSkipTake({ page, pageSize }),
    )
    return { entries: entries.map(toAccessLogResponse), page, pageSize, total }
  },
}
