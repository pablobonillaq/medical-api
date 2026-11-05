import type { Request } from 'express'
import type { AuditAction, AuditResource } from '../../generated/prisma/enums.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import type { PublicUser } from '../users/users.types.js'
import type { AuditLogWithActor } from './audit.repository.js'

// Who is acting and from where; built once per request in the controller
export type AuditContext = {
  actor: PublicUser
  ip: string | null
  userAgent: string | null
}

// What happened. `details` holds metadata only (e.g. changed field names), never clinical content
export type AuditEntry = {
  action: AuditAction
  resource: AuditResource
  patientId: string
  resourceId?: string | undefined
  details?: Prisma.InputJsonValue | undefined
}

const MAX_USER_AGENT_LENGTH = 500

export const getAuditContext = (req: Request): AuditContext => {
  if (!req.user) throw new UnauthorizedError()
  return {
    actor: req.user,
    ip: req.ip ?? null,
    userAgent: req.get('user-agent')?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
  }
}

const actorName = ({ doctor }: AuditLogWithActor['actor']) =>
  doctor ? `${doctor.firstName} ${doctor.lastName}` : null

// Full entry for admins: who, from where and what (metadata only, never clinical content)
export const toAuditLogResponse = ({ actor, actorId: _actorId, ...entry }: AuditLogWithActor) => ({
  ...entry,
  actor: { id: actor.id, email: actor.email, role: actor.role, name: actorName(actor) },
})

// What a patient sees about their own record: who and when. Staff emails, IPs and
// browsers stay private.
export const toAccessLogResponse = ({
  id,
  action,
  resource,
  resourceId,
  createdAt,
  actor,
}: AuditLogWithActor) => ({
  id,
  action,
  resource,
  resourceId,
  createdAt,
  actor: { role: actor.role, name: actorName(actor) },
})
