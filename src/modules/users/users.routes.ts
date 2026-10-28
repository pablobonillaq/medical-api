import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { usersController } from './users.controller.js'

export const usersRouter = Router()

usersRouter.use(authenticate, requireRole('admin'))

usersRouter.post('/', usersController.create)
usersRouter.get('/', usersController.list)
usersRouter.patch('/:id', usersController.update)