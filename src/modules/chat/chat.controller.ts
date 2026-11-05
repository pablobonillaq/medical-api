import type { Request, RequestHandler } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import {
  conversationIdParamsSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
  updateConversationStatusSchema,
} from './chat.schema.js'
import { chatService } from './chat.service.js'

const currentUser = (req: Request) => {
  if (!req.user) throw new UnauthorizedError()
  return req.user
}

const list: RequestHandler = async (req, res) => {
  const query = listConversationsQuerySchema.parse(req.query)
  res.json(await chatService.listConversations(query))
}

const getMine: RequestHandler = async (req, res) => {
  const conversation = await chatService.getMine(currentUser(req))
  res.json({ conversation })
}

const getById: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const conversation = await chatService.getById(conversationId, currentUser(req))
  res.json({ conversation })
}

const listMessages: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const query = listMessagesQuerySchema.parse(req.query)
  res.json(await chatService.listMessages(conversationId, query, currentUser(req)))
}

const sendMine: RequestHandler = async (req, res) => {
  const input = sendMessageSchema.parse(req.body)
  res.status(201).json(await chatService.sendAsPatient(currentUser(req), input))
}

const send: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const input = sendMessageSchema.parse(req.body)
  res.status(201).json(await chatService.send(conversationId, currentUser(req), input))
}

const markAsRead: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const conversation = await chatService.markAsRead(conversationId, currentUser(req))
  res.json({ conversation })
}

const updateStatus: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const input = updateConversationStatusSchema.parse(req.body)
  const conversation = await chatService.updateStatus(conversationId, input, currentUser(req))
  res.json({ conversation })
}

export const chatController = {
  list,
  getMine,
  getById,
  listMessages,
  sendMine,
  send,
  markAsRead,
  updateStatus,
}
