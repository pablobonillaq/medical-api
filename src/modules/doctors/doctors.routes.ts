import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { schedulesRouter } from '../schedules/schedules.routes.js'
import { doctorsController } from './doctors.controller.js'

export const doctorsRouter = Router()

doctorsRouter.use(authenticate)

doctorsRouter.get('/', doctorsController.list)
doctorsRouter.get('/:id', doctorsController.getById)
doctorsRouter.post('/', requireRole('admin'), doctorsController.create)
doctorsRouter.patch('/:id', requireRole('admin'), doctorsController.update)
doctorsRouter.put('/:id/services', requireRole('admin'), doctorsController.setServices)
doctorsRouter.use('/:doctorId', schedulesRouter)
