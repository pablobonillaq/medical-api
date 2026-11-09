import type { RequestHandler } from 'express'
import { getAuthUser } from '../auth/auth.user.js'
import {
  conversationIdParamsSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
  updateConversationStatusSchema,
} from './chat.schema.js'
import { chatService } from './chat.service.js'

const list: RequestHandler = async (req, res) => {
  const query = listConversationsQuerySchema.parse(req.query)
  res.json(await chatService.listConversations(query))
}

const getMine: RequestHandler = async (req, res) => {
  const conversation = await chatService.getMine(getAuthUser(req))
  res.json({ conversation })
}

const getById: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const conversation = await chatService.getById(conversationId, getAuthUser(req))
  res.json({ conversation })
}

const listMessages: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const query = listMessagesQuerySchema.parse(req.query)
  res.json(await chatService.listMessages(conversationId, query, getAuthUser(req)))
}

const sendMine: RequestHandler = async (req, res) => {
  const input = sendMessageSchema.parse(req.body)
  res.status(201).json(await chatService.sendAsPatient(getAuthUser(req), input))
}

const send: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const input = sendMessageSchema.parse(req.body)
  res.status(201).json(await chatService.send(conversationId, getAuthUser(req), input))
}

const markAsRead: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const conversation = await chatService.markAsRead(conversationId, getAuthUser(req))
  res.json({ conversation })
}

const updateStatus: RequestHandler = async (req, res) => {
  const { conversationId } = conversationIdParamsSchema.parse(req.params)
  const input = updateConversationStatusSchema.parse(req.body)
  const conversation = await chatService.updateStatus(conversationId, input, getAuthUser(req))
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
