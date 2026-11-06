import type { Server, Socket } from 'socket.io'
import type { MessageRecord } from '../modules/chat/chat.repository.js'
import type { ChatSide, ConversationResponse } from '../modules/chat/chat.types.js'
import type { PublicUser } from '../modules/users/users.types.js'

// Reply sent to the client's callback ("acknowledgement") after an event is handled
export type Ack<T> = (response: { ok: true; data: T } | { ok: false; error: string }) => void

// Events the server sends to clients
export interface ServerToClientEvents {
  'message:new': (payload: { message: MessageRecord; conversation: ConversationResponse }) => void
  'conversation:updated': (payload: { conversation: ConversationResponse }) => void
  typing: (payload: { conversationId: string; side: ChatSide }) => void
}

// Events clients send to the server. Payloads are unknown until Zod validates them.
export interface ClientToServerEvents {
  'message:send': (payload: unknown, ack: Ack<{ message: MessageRecord }>) => void
  'conversation:read': (payload: unknown, ack: Ack<{ conversation: ConversationResponse }>) => void
  typing: (payload: unknown) => void
}

// Only used when several server instances share events (e.g. through Redis)
type InterServerEvents = Record<string, never>

// Saved on each socket by the authentication middleware
export interface SocketData {
  user: PublicUser
}

export type AppServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>
export type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>
