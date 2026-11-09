import nodemailer from 'nodemailer'
import type { MailTransport } from './mail-transport.js'

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user?: string | undefined
  password?: string | undefined
}

// SMTP through Nodemailer. In development it points to Mailpit, which catches every email.
export const createSmtpTransport = ({ host, port, secure, user, password }: SmtpConfig) => {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    ...(user && password ? { auth: { user, pass: password } } : {}),
  })

  const transport: MailTransport = {
    async sendMail(message) {
      const info = await transporter.sendMail(message)
      return { messageId: info.messageId }
    },
  }
  return transport
}
