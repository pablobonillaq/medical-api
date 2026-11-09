// Sends a sample reminder through the configured SMTP server.
// With the default settings it goes to Mailpit: open http://localhost:8025 to see it.
import { env } from '../config/env.js'
import { createEmailChannel } from '../modules/reminders/channels/email.channel.js'
import { mailTransport } from '../shared/mail/index.js'

const channel = createEmailChannel(mailTransport, env.MAIL_FROM)

// Fictitious data; the .test domain can never receive real email
const { providerMessageId } = await channel.send(
  {
    firstName: 'Luz',
    email: 'paciente@test.com',
    phone: '+525512345678',
    emailRemindersOptIn: true,
    whatsappOptIn: false,
  },
  {
    clinicName: env.CLINIC_NAME,
    patientFirstName: 'Luz',
    doctorName: 'Ana Garay',
    serviceName: 'Consulta general',
    date: '2026-11-10',
    time: '09:30',
  },
)

console.log(`Reminder sent (${providerMessageId}) through ${env.SMTP_HOST}:${env.SMTP_PORT}`)
