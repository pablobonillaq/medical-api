import type { ReminderChannel as ReminderChannelName } from '../../generated/prisma/enums.js'

// Who receives the reminder and what they agreed to
export type ReminderRecipient = {
  firstName: string
  email: string | null
  phone: string
  emailRemindersOptIn: boolean
  whatsappOptIn: boolean
}

// What the reminder says. Date and time are already in the clinic's time zone.
export type ReminderContent = {
  clinicName: string
  patientFirstName: string
  doctorName: string
  serviceName: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
}

// A way to deliver reminders. Email now; WhatsApp later implements the same interface.
export interface ReminderChannel {
  readonly name: ReminderChannelName
  // Has a destination (email, phone) and the patient's consent for this channel
  canReach(recipient: ReminderRecipient): boolean
  send(
    recipient: ReminderRecipient,
    content: ReminderContent,
  ): Promise<{ providerMessageId: string }>
}
