import type { ZodOpenApiPathsObject } from 'zod-openapi'
import { errors, jsonBody } from '../../docs/openapi.helpers.js'
import {
  conversationIdParamsSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
  updateConversationStatusSchema,
} from './chat.schema.js'

export const chatPaths: ZodOpenApiPathsObject = {
  '/conversations/me': {
    get: {
      tags: ['Chat'],
      summary: 'My conversation with the clinic',
      description: 'Patients only. `conversation` is null until the first message.',
      responses: {
        200: { description: 'The conversation with its unread count, or null' },
        ...errors(401, 403, 404),
      },
    },
  },
  '/conversations/me/messages': {
    post: {
      tags: ['Chat'],
      summary: 'Write to the clinic',
      description:
        'Patients only. The first message creates the conversation; ' +
        'a message to a closed conversation opens it again.',
      requestBody: jsonBody(sendMessageSchema),
      responses: {
        201: { description: 'The message and the conversation' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/conversations': {
    get: {
      tags: ['Chat'],
      summary: 'Front desk inbox',
      description:
        'Front desk only. Most recent activity first, with the unread patient messages of each one.',
      requestParams: { query: listConversationsQuerySchema },
      responses: {
        200: { description: 'One page of conversations' },
        ...errors(400, 401, 403),
      },
    },
  },
  '/conversations/{conversationId}': {
    get: {
      tags: ['Chat'],
      summary: 'Get a conversation',
      description: "Front desk, or the conversation's patient. Other patients get 404.",
      requestParams: { path: conversationIdParamsSchema },
      responses: {
        200: { description: 'The conversation with the unread count of your side' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/conversations/{conversationId}/messages': {
    get: {
      tags: ['Chat'],
      summary: 'Read messages',
      description:
        'Oldest first in each page. To load older messages, send `nextCursor` as `before`.',
      requestParams: { path: conversationIdParamsSchema, query: listMessagesQuerySchema },
      responses: {
        200: { description: 'The messages and the cursor of the next page' },
        ...errors(400, 401, 403, 404),
      },
    },
    post: {
      tags: ['Chat'],
      summary: 'Send a message',
      description: 'Writing also marks the earlier messages as read for your side.',
      requestParams: { path: conversationIdParamsSchema },
      requestBody: jsonBody(sendMessageSchema),
      responses: {
        201: { description: 'The message and the conversation' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/conversations/{conversationId}/read': {
    post: {
      tags: ['Chat'],
      summary: 'Mark the conversation as read',
      requestParams: { path: conversationIdParamsSchema },
      responses: {
        200: { description: 'The conversation' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
  '/conversations/{conversationId}/status': {
    patch: {
      tags: ['Chat'],
      summary: 'Close or reopen a conversation',
      description: 'Front desk only.',
      requestParams: { path: conversationIdParamsSchema },
      requestBody: jsonBody(updateConversationStatusSchema),
      responses: {
        200: { description: 'The conversation' },
        ...errors(400, 401, 403, 404),
      },
    },
  },
}
