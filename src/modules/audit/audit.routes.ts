import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { auditController } from './audit.controller.js'

// Only admins can browse the audit log. Entries hold metadata, never clinical content.
export const auditLogsRouter = Router()

auditLogsRouter.use(authenticate, requireRole('admin'))
auditLogsRouter.get('/', auditController.list)
