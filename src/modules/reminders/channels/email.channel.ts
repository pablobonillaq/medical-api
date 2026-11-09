import type { MailTransport } from '../../../shared/mail/mail-transport.js'
import type { ReminderChannel } from '../reminder.types.js'
import { renderReminderEmail } from './reminder-email.template.js'

// The transport is passed in: SMTP in the app, an in-memory fake in tests
export const createEmailChannel = (transport: MailTransport, from: string): ReminderChannel => ({
  name: 'email',

  canReach: (recipient) => recipient.emailRemindersOptIn && recipient.email !== null,

  async send(recipient, content) {
    if (!recipient.email) throw new Error('The patient has no email address')
    const { messageId } = await transport.sendMail({
      from,
      to: recipient.email,
      ...renderReminderEmail(content),
    })
    return { providerMessageId: messageId }
  },
})
