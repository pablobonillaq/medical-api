import { beforeEach, describe, expect, it, vi } from 'vitest'

// Nodemailer is replaced by a fake: these tests check what the adapter asks of it
const { createTransport, sendMail } = vi.hoisted(() => {
  const sendMail = vi.fn()
  return { sendMail, createTransport: vi.fn(() => ({ sendMail })) }
})
vi.mock('nodemailer', () => ({ default: { createTransport } }))

const { createSmtpTransport } = await import('./smtp-transport.js')

const message = {
  from: 'Clínica <no-reply@clinica.test>',
  to: 'luz@correo.test',
  subject: 'Recordatorio',
  text: 'Hola',
  html: '<p>Hola</p>',
}

describe('createSmtpTransport', () => {
  beforeEach(() => {
    createTransport.mockReset()
    createTransport.mockImplementation(() => ({ sendMail }))
    sendMail.mockReset()
  })

  it('connects without credentials when none are configured', () => {
    createSmtpTransport({ host: 'localhost', port: 1025, secure: false })

    expect(createTransport).toHaveBeenCalledWith({ host: 'localhost', port: 1025, secure: false })
  })

  it('passes the user and password when both are configured', () => {
    createSmtpTransport({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      user: 'clinic',
      password: 'secret',
    })

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test',
      port: 465,
      secure: true,
      auth: { user: 'clinic', pass: 'secret' },
    })
  })

  it('sends the message and returns the id given by the server', async () => {
    sendMail.mockResolvedValue({ messageId: '<abc@smtp>' })
    const transport = createSmtpTransport({ host: 'localhost', port: 1025, secure: false })

    const result = await transport.sendMail(message)

    expect(sendMail).toHaveBeenCalledWith(message)
    expect(result).toEqual({ messageId: '<abc@smtp>' })
  })

  it('creates the app transport from the environment settings', async () => {
    await import('./index.js')

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'localhost', port: 1025 }),
    )
  })
})
