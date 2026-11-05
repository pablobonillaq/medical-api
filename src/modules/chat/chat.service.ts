import { prisma } from '../../db/prisma.js'
import { NotFoundError } from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import { patientsRepository } from '../patients/patients.repository.js'
import type { PublicUser } from '../users/users.types.js'
import { chatRepository, type ConversationWithPatient } from './chat.repository.js'
import type {
  ListConversationsQuery,
  ListMessagesQuery,
  SendMessageInput,
  UpdateConversationStatusInput,
} from './chat.schema.js'
import { toConversationResponse, type ChatSide } from './chat.types.js'

const findPatientIdOrThrow = async (user: PublicUser) => {
  const patient = await patientsRepository.findByUserId(user.id)
  if (!patient) throw new NotFoundError('Patient profile not found')
  return patient.id
}

// The front desk sees every conversation; a patient only their own.
// 404 instead of 403: do not reveal that another patient's conversation exists.
const findConversationOrThrow = async (conversationId: string, user: PublicUser) => {
  const conversation = await chatRepository.findById(conversationId)
  if (conversation && user.role === 'employee') {
    return { conversation, side: 'clinic' as ChatSide }
  }
  if (conversation && user.role === 'patient' && conversation.patient.userId === user.id) {
    return { conversation, side: 'patient' as ChatSide }
  }
  throw new NotFoundError('Conversation not found')
}

// Saves the message and updates the conversation in one transaction.
// Writing a message also means the sender has read everything before it.
const saveMessage = async (
  conversation: ConversationWithPatient,
  side: ChatSide,
  user: PublicUser,
  { body }: SendMessageInput,
) =>
  prisma.$transaction(async (tx) => {
    const message = await chatRepository.createMessage(
      { conversationId: conversation.id, senderId: user.id, senderRole: user.role, body },
      tx,
    )
    const updated = await chatRepository.update(
      conversation.id,
      side === 'patient'
        ? // A new message from the patient reopens a closed conversation
          { lastMessageAt: message.createdAt, patientLastReadAt: message.createdAt, status: 'open' }
        : { lastMessageAt: message.createdAt, clinicLastReadAt: message.createdAt },
      tx,
    )
    return { message, conversation: updated }
  })

const unreadFor = async (conversation: ConversationWithPatient, side: ChatSide) =>
  side === 'patient'
    ? chatRepository.countUnreadByPatient(conversation)
    : ((await chatRepository.countUnreadByClinic([conversation.id])).get(conversation.id) ?? 0)

export const chatService = {
  // Front desk inbox with the number of unread patient messages in each conversation
  async listConversations({ status, page, pageSize }: ListConversationsQuery) {
    const [conversations, total] = await chatRepository.findMany({
      status,
      ...toSkipTake({ page, pageSize }),
    })
    const unread = await chatRepository.countUnreadByClinic(conversations.map((c) => c.id))
    return {
      conversations: conversations.map((c) => toConversationResponse(c, unread.get(c.id) ?? 0)),
      page,
      pageSize,
      total,
    }
  },

  // null until the patient writes their first message
  async getMine(user: PublicUser) {
    const conversation = await chatRepository.findByPatientId(await findPatientIdOrThrow(user))
    if (!conversation) return null
    return toConversationResponse(conversation, await unreadFor(conversation, 'patient'))
  },

  async getById(conversationId: string, user: PublicUser) {
    const { conversation, side } = await findConversationOrThrow(conversationId, user)
    return toConversationResponse(conversation, await unreadFor(conversation, side))
  },

  async listMessages(
    conversationId: string,
    { before, limit }: ListMessagesQuery,
    user: PublicUser,
  ) {
    await findConversationOrThrow(conversationId, user)

    const rows = await chatRepository.findMessages(conversationId, { before, take: limit + 1 })
    const hasMore = rows.length > limit
    // Oldest first, the order a chat window shows them
    const messages = rows.slice(0, limit).reverse()
    return { messages, nextCursor: hasMore ? (messages[0]?.id ?? null) : null }
  },

  async sendAsPatient(user: PublicUser, input: SendMessageInput) {
    const conversation = await chatRepository.findOrCreateForPatient(
      await findPatientIdOrThrow(user),
    )
    const result = await saveMessage(conversation, 'patient', user, input)
    return { message: result.message, conversation: toConversationResponse(result.conversation, 0) }
  },

  async send(conversationId: string, user: PublicUser, input: SendMessageInput) {
    const { conversation, side } = await findConversationOrThrow(conversationId, user)
    const result = await saveMessage(conversation, side, user, input)
    return {
      message: result.message,
      conversation: toConversationResponse(
        result.conversation,
        await unreadFor(result.conversation, side),
      ),
    }
  },

  async markAsRead(conversationId: string, user: PublicUser) {
    const { conversation, side } = await findConversationOrThrow(conversationId, user)
    // Read up to the last message saved. Uses the database's timestamp, so a message that
    // arrives while this runs stays unread.
    const readAt = conversation.lastMessageAt ?? new Date()
    const updated = await chatRepository.update(
      conversation.id,
      side === 'patient' ? { patientLastReadAt: readAt } : { clinicLastReadAt: readAt },
    )
    return toConversationResponse(updated, 0)
  },

  async updateStatus(
    conversationId: string,
    { status }: UpdateConversationStatusInput,
    user: PublicUser,
  ) {
    const { conversation } = await findConversationOrThrow(conversationId, user)
    const updated = await chatRepository.update(conversation.id, { status })
    return toConversationResponse(updated, await unreadFor(updated, 'clinic'))
  },
}
