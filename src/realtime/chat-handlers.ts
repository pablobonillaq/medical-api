import { z, ZodError } from 'zod'
import { socketConversationSchema, socketSendMessageSchema } from '../modules/chat/chat.schema.js'
import { chatService } from '../modules/chat/chat.service.js'
import { AppError, BadRequestError } from '../shared/errors/app-error.js'
import { STAFF_ROOM, userRoom } from './rooms.js'
import type { Ack, AppSocket } from './socket.types.js'

// Same rules as the REST error handler: validation and known errors are shown, the rest is hidden
const toErrorMessage = (error: unknown) => {
  if (error instanceof ZodError) return z.prettifyError(error)
  if (error instanceof AppError) return error.message
  console.error('Socket event failed', error)
  return 'Something went wrong'
}

// Runs the task and answers the client's callback with { ok, data } or { ok, error }.
// A client may emit without a callback; then there is nobody to answer.
const reply = <T>(ack: Ack<T> | undefined, task: () => Promise<T>) => {
  const respond = typeof ack === 'function' ? ack : undefined
  task().then(
    (data) => respond?.({ ok: true, data }),
    (error: unknown) => respond?.({ ok: false, error: toErrorMessage(error) }),
  )
}

export const registerChatHandlers = (socket: AppSocket) => {
  const { user } = socket.data

  socket.on('message:send', (payload, ack) => {
    reply(ack, async () => {
      const { conversationId, ...input } = socketSendMessageSchema.parse(payload)
      if (!conversationId && user.role !== 'patient') {
        throw new BadRequestError('conversationId is required')
      }
      const { message } = conversationId
        ? await chatService.send(conversationId, user, input)
        : await chatService.sendAsPatient(user, input)
      // Everyone else hears about it through "message:new" (see chat-broadcast.ts)
      return { message }
    })
  })

  socket.on('conversation:read', (payload, ack) => {
    reply(ack, async () => {
      const { conversationId } = socketConversationSchema.parse(payload)
      return { conversation: await chatService.markAsRead(conversationId, user) }
    })
  })

  // "Typing…" is best effort: it is not saved, has no callback and fails silently
  socket.on('typing', (payload) => {
    const parsed = socketConversationSchema.safeParse(payload)
    if (!parsed.success) return

    chatService.authorize(parsed.data.conversationId, user).then(
      ({ conversation, side }) => {
        const rooms = [STAFF_ROOM]
        if (conversation.patient.userId) rooms.push(userRoom(conversation.patient.userId))
        // socket.to() skips the socket that is typing
        socket.to(rooms).emit('typing', { conversationId: conversation.id, side })
      },
      () => undefined,
    )
  })
}
