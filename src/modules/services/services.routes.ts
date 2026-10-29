import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { servicesController } from './services.controller.js'

export const servicesRouter = Router()

servicesRouter.use(authenticate)

servicesRouter.get('/', servicesController.list)
servicesRouter.get('/:id', servicesController.getById)
servicesRouter.post('/', requireRole('admin'), servicesController.create)
servicesRouter.patch('/:id', requireRole('admin'), servicesController.update)