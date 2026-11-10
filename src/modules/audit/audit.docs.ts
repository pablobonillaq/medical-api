import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors } from '../../docs/openapi.helpers.js'
import { accessLogQuerySchema, listAuditLogsQuerySchema } from './audit.schema.js'

export const auditPaths: ZodOpenApiPathsObject = {
  '/audit-logs': {
    get: {
      tags: ['Audit log'],
      summary: 'Browse the audit log',
      description:
        'Admins only. Who read, created, changed or was denied access to medical records, ' +
        'newest first. Entries hold metadata only, never clinical content or file names.',
      requestParams: { query: listAuditLogsQuerySchema },
      responses: {
        200: { description: 'One page of entries' },
        ...errors(400, 401, 403),
      },
    },
  },
  '/patients/me/access-log': {
    get: {
      tags: ['Audit log'],
      summary: 'Who opened my medical record',
      description:
        "Patients only. Leaves out the patient's own visits and staff emails, IPs and browsers.",
      requestParams: { query: accessLogQuerySchema },
      responses: {
        200: { description: 'One page of accesses' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
