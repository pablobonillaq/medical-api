import type { RequestHandler } from 'express'
import { getAuthUser } from '../auth/auth.user.js'
import { accessLogQuerySchema, listAuditLogsQuerySchema } from './audit.schema.js'
import { auditService } from './audit.service.js'

const list: RequestHandler = async (req, res) => {
  const query = listAuditLogsQuerySchema.parse(req.query)
  const result = await auditService.list(query)
  res.json(result)
}

const myAccessLog: RequestHandler = async (req, res) => {
  const query = accessLogQuerySchema.parse(req.query)
  const result = await auditService.listMyAccessLog(getAuthUser(req), query)
  res.json(result)
}

export const auditController = { list, myAccessLog }
