import type { ConversationWithPatient, MessageRecord } from '../modules/chat/chat.repository.js'
import { chatService } from '../modules/chat/chat.service.js'
import type { ConversationResponse } from '../modules/chat/chat.types.js'
import { appEvents } from '../shared/events.js'
import { STAFF_ROOM, userRoom } from './rooms.js'
import type { AppServer } from './socket.types.js'

const logError = (error: unknown) => console.error('Chat broadcast failed', error)

// Each side gets the conversation with its own unread count
const sendToBothSides = async (
  conversation: ConversationWithPatient,
  send: (room: string, conversation: ConversationResponse) => void,
) => {
  const [forClinic, forPatient] = await Promise.all([
    chatService.describe(conversation, 'clinic'),
    chatService.describe(conversation, 'patient'),
  ])
  send(STAFF_ROOM, forClinic)
  if (conversation.patient.userId) send(userRoom(conversation.patient.userId), forPatient)
}

// Turns domain events into Socket.IO events. Works the same whether the change came from
// the REST API or from a socket. Returns a function that stops listening.
export const registerChatBroadcast = (io: AppServer) => {
  const onMessageCreated = ({
    message,
    conversation,
  }: {
    message: MessageRecord
    conversation: ConversationWithPatient
  }) => {
    sendToBothSides(conversation, (room, response) =>
      io.to(room).emit('message:new', { message, conversation: response }),
    ).catch(logError)
  }

  const onConversationUpdated = ({ conversation }: { conversation: ConversationWithPatient }) => {
    sendToBothSides(conversation, (room, response) =>
      io.to(room).emit('conversation:updated', { conversation: response }),
    ).catch(logError)
  }

  // A disabled account (or one that changed role) loses its open sockets right away.
  // If it reconnects, the authentication middleware decides again.
  const onAccessChanged = ({ userId }: { userId: string }) => {
    io.in(userRoom(userId)).disconnectSockets(true)
  }

  appEvents.on('chat:message-created', onMessageCreated)
  appEvents.on('chat:conversation-updated', onConversationUpdated)
  appEvents.on('user:access-changed', onAccessChanged)

  return () => {
    appEvents.off('chat:message-created', onMessageCreated)
    appEvents.off('chat:conversation-updated', onConversationUpdated)
    appEvents.off('user:access-changed', onAccessChanged)
  }
}
