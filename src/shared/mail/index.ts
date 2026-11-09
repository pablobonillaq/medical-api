import { env } from '../../config/env.js'
import { createSmtpTransport } from './smtp-transport.js'

export type { MailMessage, MailTransport } from './mail-transport.js'

export const mailTransport = createSmtpTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  user: env.SMTP_USER,
  password: env.SMTP_PASSWORD,
})
