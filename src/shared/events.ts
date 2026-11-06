import { EventEmitter } from 'node:events'
import type { ConversationWithPatient, MessageRecord } from '../modules/chat/chat.repository.js'

// Things that already happened (and were saved). Services emit them; other layers, like
// Socket.IO, listen. Services never need to know who is listening.
type AppEvents = {
  'chat:message-created': [{ message: MessageRecord; conversation: ConversationWithPatient }]
  'chat:conversation-updated': [{ conversation: ConversationWithPatient }]
  // The user was disabled or changed role: open sessions must be checked again
  'user:access-changed': [{ userId: string }]
}

export const appEvents = new EventEmitter<AppEvents>()
