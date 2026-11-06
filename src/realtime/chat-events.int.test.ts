import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../db/prisma.js'
import { createPatient, createUser, loginAs, resetDatabase } from '../test/helpers.js'
import {
  collectEvents,
  connectSocket,
  loginCookie,
  sleep,
  startSocketServer,
  waitForEvent,
  type ClientSocket,
} from '../test/socket-helpers.js'
import type { AppServer } from './socket.types.js'

describe('chat events (integration)', () => {
  let io: AppServer
  let url: string
  const openSockets: ClientSocket[] = []
  let patientEmail: string
  let employeeEmail: string
  let employeeId: string

  beforeAll(async () => {
    const server = await startSocketServer()
    io = server.io
    url = server.url
  })

  beforeEach(async () => {
    await resetDatabase()
    const patient = await createPatient()
    const employee = await createUser('employee')
    patientEmail = patient.user?.email ?? ''
    employeeEmail = employee.email
    employeeId = employee.id
  })

  afterEach(() => {
    for (const socket of openSockets.splice(0)) socket.close()
  })

  afterAll(async () => {
    await io.close()
    await prisma.$disconnect()
  })

  const connectAs = async (email: string) => {
    const socket = await connectSocket(url, await loginCookie(email))
    openSockets.push(socket)
    return socket
  }

  // The patient's first message creates the conversation
  const startConversation = async (patient: ClientSocket) => {
    const response = await patient.timeout(2000).emitWithAck('message:send', { body: 'Hola' })
    if (!response.ok) throw new Error(response.error)
    return response.data.message.conversationId as string
  }

  it('confirms the message to the sender and delivers it to the front desk', async () => {
    const patient = await connectAs(patientEmail)
    const employee = await connectAs(employeeEmail)
    const delivered = waitForEvent(employee, 'message:new')

    const response = await patient
      .timeout(2000)
      .emitWithAck('message:send', { body: '¿Tienen consulta el sábado?' })

    expect(response).toMatchObject({ ok: true, data: { message: { senderRole: 'patient' } } })
    const event = await delivered
    expect(event.message.body).toBe('¿Tienen consulta el sábado?')
    // The front desk sees its own unread count
    expect(event.conversation.unreadCount).toBe(1)
  })

  it('pushes replies sent through the REST API to the patient in real time', async () => {
    const patient = await connectAs(patientEmail)
    const conversationId = await startConversation(patient)
    const delivered = waitForEvent(patient, 'message:new', {
      filter: ({ message }) => message.senderRole === 'employee',
    })

    const employeeAgent = await loginAs(employeeEmail)
    await employeeAgent
      .post(`/conversations/${conversationId}/messages`)
      .send({ body: 'Sí, de 9 a 13 h' })
      .expect(201)

    const event = await delivered
    expect(event.message).toMatchObject({ body: 'Sí, de 9 a 13 h', senderRole: 'employee' })
    expect(event.conversation.unreadCount).toBe(1)
  })

  it('marks a conversation as read and tells the other side', async () => {
    const patient = await connectAs(patientEmail)
    const employee = await connectAs(employeeEmail)
    const conversationId = await startConversation(patient)
    const updated = waitForEvent(patient, 'conversation:updated')

    const response = await employee
      .timeout(2000)
      .emitWithAck('conversation:read', { conversationId })

    expect(response).toMatchObject({ ok: true, data: { conversation: { unreadCount: 0 } } })
    const event = await updated
    expect(event.conversation.clinicLastReadAt).not.toBeNull()
  })

  it('answers invalid payloads with an error and saves nothing', async () => {
    const patient = await connectAs(patientEmail)

    const response = await patient.timeout(2000).emitWithAck('message:send', { body: '   ' })

    expect(response.ok).toBe(false)
    expect(response.ok ? '' : response.error).toContain('body cannot be empty')
    expect(await prisma.message.count()).toBe(0)
  })

  it('requires conversationId from the front desk', async () => {
    const employee = await connectAs(employeeEmail)

    const response = await employee.timeout(2000).emitWithAck('message:send', { body: 'Hola' })

    expect(response).toEqual({ ok: false, error: 'conversationId is required' })
  })

  it("does not let a patient write in another patient's conversation", async () => {
    const patient = await connectAs(patientEmail)
    const conversationId = await startConversation(patient)
    const other = await createPatient()
    const otherSocket = await connectAs(other.user?.email ?? '')

    const response = await otherSocket
      .timeout(2000)
      .emitWithAck('message:send', { conversationId, body: 'Hola' })

    expect(response).toEqual({ ok: false, error: 'Conversation not found' })
  })

  it('shows "typing" to the front desk but not to other patients', async () => {
    const patient = await connectAs(patientEmail)
    const employee = await connectAs(employeeEmail)
    const conversationId = await startConversation(patient)
    const other = await createPatient()
    const otherSocket = await connectAs(other.user?.email ?? '')
    const seenByOther = collectEvents(otherSocket, 'typing')
    const seenByEmployee = waitForEvent(employee, 'typing')

    patient.emit('typing', { conversationId })

    expect(await seenByEmployee).toEqual({ conversationId, side: 'patient' })
    await sleep(100)
    expect(seenByOther).toHaveLength(0)
  })

  it('disconnects the sockets of an account as soon as it is disabled', async () => {
    const employee = await connectAs(employeeEmail)
    const disconnected = new Promise((resolve) => employee.once('disconnect', resolve))
    const admin = await createUser('admin')
    const adminAgent = await loginAs(admin.email)

    await adminAgent.patch(`/users/${employeeId}`).send({ active: false }).expect(200)

    expect(await disconnected).toBe('io server disconnect')
  })
})
