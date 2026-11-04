import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { appointmentsController } from './appointments.controller.js'

export const appointmentsRouter = Router()

appointmentsRouter.use(authenticate)

appointmentsRouter.post(
  '/',
  requireRole('patient', 'employee', 'admin'),
  appointmentsController.create,
)
appointmentsRouter.get('/', appointmentsController.list)
appointmentsRouter.get('/:id', appointmentsController.getById)
appointmentsRouter.patch('/:id/cancel', appointmentsController.cancel)
