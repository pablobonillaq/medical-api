import { Router } from 'express'
import { authController } from './auth.controller.js'
import { authenticate } from './auth.middleware.js'

export const authRouter = Router()

authRouter.post('/register', authController.register)
authRouter.post('/login', authController.login)
authRouter.post('/logout', authController.logout)
authRouter.get('/me', authenticate, authController.me)