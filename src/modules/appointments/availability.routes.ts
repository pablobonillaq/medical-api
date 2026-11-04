import { Router } from 'express'
import { authenticate } from '../auth/auth.middleware.js'
import { availabilityController } from './availability.controller.js'

export const availabilityRouter = Router()

availabilityRouter.get('/', authenticate, availabilityController.getSlots)
