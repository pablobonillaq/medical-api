import type { ConversationWithPatient } from './chat.repository.js'

// Who is looking at a conversation: the patient or the clinic (front desk)
export type ChatSide = 'patient' | 'clinic'

// The patient's userId stays internal; clients only need the patient profile
export const toConversationResponse = (
  { patient, ...conversation }: ConversationWithPatient,
  unreadCount: number,
) => ({
  ...conversation,
  patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName },
  unreadCount,
})

export type ConversationResponse = ReturnType<typeof toConversationResponse>
