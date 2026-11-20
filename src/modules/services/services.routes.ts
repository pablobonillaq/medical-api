import { Router } from 'express'
import { authenticate, optionalAuthenticate, requireRole } from '../auth/auth.middleware.js'
import { servicesController } from './services.controller.js'

export const servicesRouter = Router()

// Public: anyone can see the clinic's services, with or without a session
servicesRouter.get('/', optionalAuthenticate, servicesController.list)
servicesRouter.get('/:id', optionalAuthenticate, servicesController.getById)

servicesRouter.use(authenticate)

servicesRouter.post('/', requireRole('admin'), servicesController.create)
servicesRouter.patch('/:id', requireRole('admin'), servicesController.update)
