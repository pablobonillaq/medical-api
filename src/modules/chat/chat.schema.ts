import { z } from 'zod'
import { ConversationStatus } from '../../generated/prisma/enums.js'
import { paginationQuerySchema } from '../../shared/schemas/common.js'
import { DEFAULT_MESSAGES_LIMIT, MAX_MESSAGE_LENGTH, MAX_MESSAGES_LIMIT } from './chat.constants.js'

export const conversationIdParamsSchema = z.object({
  conversationId: z.uuid({ error: 'Invalid conversation id' }),
})

export const sendMessageSchema = z.object({
  body: z
    .string({ error: 'body is required' })
    .trim()
    .min(1, { error: 'body cannot be empty' })
    .max(MAX_MESSAGE_LENGTH, { error: `body must be at most ${MAX_MESSAGE_LENGTH} characters` }),
})

// Cursor pagination: `before` is the id of the oldest message the client already has
export const listMessagesQuerySchema = z.object({
  before: z.uuid({ error: 'before must be a message id' }).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1, { error: `limit must be between 1 and ${MAX_MESSAGES_LIMIT}` })
    .max(MAX_MESSAGES_LIMIT, { error: `limit must be between 1 and ${MAX_MESSAGES_LIMIT}` })
    .default(DEFAULT_MESSAGES_LIMIT),
})

export const listConversationsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ConversationStatus, { error: 'status must be open or closed' }).optional(),
})

export const updateConversationStatusSchema = z.object({
  status: z.enum(ConversationStatus, { error: 'status must be open or closed' }),
})

// Socket.IO payloads. A patient may leave out conversationId: it is their own conversation.
export const socketSendMessageSchema = sendMessageSchema.extend({
  conversationId: z.uuid({ error: 'Invalid conversation id' }).optional(),
})

export const socketConversationSchema = conversationIdParamsSchema

export type SendMessageInput = z.infer<typeof sendMessageSchema>
export type ListMessagesQuery = z.infer<typeof listMessagesQuerySchema>
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>
export type UpdateConversationStatusInput = z.infer<typeof updateConversationStatusSchema>
