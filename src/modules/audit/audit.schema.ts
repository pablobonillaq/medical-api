import { z } from 'zod'
import { AuditAction, AuditResource } from '../../generated/prisma/enums.js'
import { isoDateTimeSchema, paginationQuerySchema } from '../../shared/schemas/common.js'

export const listAuditLogsQuerySchema = paginationQuerySchema
  .extend({
    patientId: z.uuid({ error: 'Invalid patient id' }).optional(),
    actorId: z.uuid({ error: 'Invalid actor id' }).optional(),
    action: z.enum(AuditAction, { error: 'Invalid action' }).optional(),
    resource: z.enum(AuditResource, { error: 'Invalid resource' }).optional(),
    from: isoDateTimeSchema.optional(),
    to: isoDateTimeSchema.optional(),
  })
  .refine(({ from, to }) => !from || !to || from < to, {
    error: 'from must be before to',
    path: ['to'],
  })

export const accessLogQuerySchema = paginationQuerySchema

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>
export type AccessLogQuery = z.infer<typeof accessLogQuerySchema>
