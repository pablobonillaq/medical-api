import type { Request } from 'express'
import type { AuditAction, AuditResource } from '../../generated/prisma/enums.js'
import type { Prisma } from '../../generated/prisma/client.js'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import type { PublicUser } from '../users/users.types.js'

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
