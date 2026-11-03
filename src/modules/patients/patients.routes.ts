import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { patientsController } from './patients.controller.js'

export const patientsRouter = Router()

patientsRouter.use(authenticate)

// /me must be declared before /:id, otherwise "me" would be read as an id
patientsRouter.get('/me', requireRole('patient'), patientsController.getMine)
patientsRouter.get('/', requireRole('admin', 'employee'), patientsController.list)
patientsRouter.post('/', requireRole('admin', 'employee'), patientsController.create)
patientsRouter.get('/:id', patientsController.getById)
patientsRouter.patch('/:id', patientsController.update)
