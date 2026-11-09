// The only thing the app needs from an email provider. Nodemailer implements it for SMTP;
// tests use a fake that keeps the messages in memory.
export type MailMessage = {
  from: string
  to: string
  subject: string
  text: string
  html: string
}

export interface MailTransport {
  sendMail(message: MailMessage): Promise<{ messageId: string }>
}
