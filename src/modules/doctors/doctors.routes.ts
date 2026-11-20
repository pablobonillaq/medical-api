import { Router } from 'express'
import { authenticate, optionalAuthenticate, requireRole } from '../auth/auth.middleware.js'
import { schedulesRouter } from '../schedules/schedules.routes.js'
import { doctorsController } from './doctors.controller.js'

export const doctorsRouter = Router()

// Public: anyone can see the clinic's doctors, with or without a session. Visitors and
// patients get the public profile, without account data (see toPublicDoctor)
doctorsRouter.get('/', optionalAuthenticate, doctorsController.list)
doctorsRouter.get('/:id', optionalAuthenticate, doctorsController.getById)

doctorsRouter.use(authenticate)

doctorsRouter.post('/', requireRole('admin'), doctorsController.create)
doctorsRouter.patch('/:id', requireRole('admin'), doctorsController.update)
doctorsRouter.put('/:id/services', requireRole('admin'), doctorsController.setServices)
doctorsRouter.use('/:doctorId', schedulesRouter)
