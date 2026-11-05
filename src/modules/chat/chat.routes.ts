import { Router } from 'express'
import { authenticate, requireRole } from '../auth/auth.middleware.js'
import { chatController } from './chat.controller.js'

// Chat between each patient and the clinic's front desk. Doctors and admins do not take part.
export const chatRouter = Router()

chatRouter.use(authenticate, requireRole('patient', 'employee'))

// /me routes must be declared before /:conversationId
chatRouter.get('/me', requireRole('patient'), chatController.getMine)
chatRouter.post('/me/messages', requireRole('patient'), chatController.sendMine)

chatRouter.get('/', requireRole('employee'), chatController.list)
chatRouter.get('/:conversationId', chatController.getById)
chatRouter.get('/:conversationId/messages', chatController.listMessages)
chatRouter.post('/:conversationId/messages', chatController.send)
chatRouter.post('/:conversationId/read', chatController.markAsRead)
chatRouter.patch('/:conversationId/status', requireRole('employee'), chatController.updateStatus)
