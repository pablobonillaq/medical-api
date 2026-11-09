import { describe, expect, it } from 'vitest'
import type { MailMessage, MailTransport } from '../../../shared/mail/mail-transport.js'
import type { ReminderContent, ReminderRecipient } from '../reminder.types.js'
import { createEmailChannel } from './email.channel.js'

// Keeps the messages in memory instead of sending them
const createFakeTransport = () => {
  const sent: MailMessage[] = []
  const transport: MailTransport = {
    sendMail: (message) => {
      sent.push(message)
      return Promise.resolve({ messageId: `<fake-${sent.length}@test>` })
    },
  }
  return { transport, sent }
}

const recipient: ReminderRecipient = {
  firstName: 'Luz',
  email: 'luz@correo.test',
  phone: '+525512345678',
  emailRemindersOptIn: true,
  whatsappOptIn: false,
}

const content: ReminderContent = {
  clinicName: 'Clínica Demo',
  patientFirstName: 'Luz',
  doctorName: 'Ana Garay',
  serviceName: 'Consulta general',
  date: '2026-11-10',
  time: '09:30',
}

describe('email channel', () => {
  it('only reaches patients with an email who agreed to email reminders', () => {
    const channel = createEmailChannel(createFakeTransport().transport, 'x@test')

    expect(channel.canReach(recipient)).toBe(true)
    expect(channel.canReach({ ...recipient, emailRemindersOptIn: false })).toBe(false)
    expect(channel.canReach({ ...recipient, email: null })).toBe(false)
  })

  it('sends the rendered reminder and returns the provider message id', async () => {
    const { transport, sent } = createFakeTransport()
    const channel = createEmailChannel(transport, 'Clínica <no-reply@clinica.test>')

    const result = await channel.send(recipient, content)

    expect(result).toEqual({ providerMessageId: '<fake-1@test>' })
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({
      from: 'Clínica <no-reply@clinica.test>',
      to: 'luz@correo.test',
      subject: 'Recordatorio: tu cita del martes 10 de noviembre a las 09:30',
    })
  })
})
