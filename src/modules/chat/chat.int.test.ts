import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
  type TestAgent,
} from '../../test/helpers.js'

type Message = { id: string; body: string }

describe('chat (integration)', () => {
  let patient: TestAgent
  let employee: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    const patientRecord = await createPatient()
    const employeeUser = await createUser('employee')
    patient = await loginAs(patientRecord.user?.email ?? '')
    employee = await loginAs(employeeUser.email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // The patient's first message creates the conversation
  const startConversation = async (body = 'Hola, ¿tienen consulta el sábado?') => {
    const response = await patient.post('/conversations/me/messages').send({ body }).expect(201)
    return response.body.conversation.id as string
  }

  it('creates the conversation with the first message and shows it in the inbox', async () => {
    const response = await patient
      .post('/conversations/me/messages')
      .send({ body: '  Hola  ' })
      .expect(201)

    expect(response.body.message).toMatchObject({ body: 'Hola', senderRole: 'patient' })
    expect(response.body.conversation).toMatchObject({ status: 'open', unreadCount: 0 })

    const inbox = await employee.get('/conversations').expect(200)
    expect(inbox.body.total).toBe(1)
    expect(inbox.body.conversations[0]).toMatchObject({
      id: response.body.conversation.id,
      patient: { firstName: 'Luz', lastName: 'Méndez' },
      unreadCount: 1,
    })
  })

  it('counts unread messages on each side until they are read', async () => {
    const conversationId = await startConversation()

    // Replying counts as reading the patient's messages
    await employee
      .post(`/conversations/${conversationId}/messages`)
      .send({ body: 'Sí, de 9 a 13 h' })
      .expect(201)
    const inbox = await employee.get('/conversations').expect(200)
    expect(inbox.body.conversations[0].unreadCount).toBe(0)

    const before = await patient.get('/conversations/me').expect(200)
    expect(before.body.conversation.unreadCount).toBe(1)

    await patient.post(`/conversations/${conversationId}/read`).expect(200)
    const after = await patient.get('/conversations/me').expect(200)
    expect(after.body.conversation.unreadCount).toBe(0)
  })

  it('pages through older messages with a cursor, oldest first in each page', async () => {
    const conversationId = await startConversation('1')
    for (const body of ['2', '3', '4', '5']) {
      await patient.post('/conversations/me/messages').send({ body }).expect(201)
    }
    const url = `/conversations/${conversationId}/messages`

    const latest = await employee.get(url).query({ limit: 2 }).expect(200)
    const older = await employee
      .get(url)
      .query({ limit: 2, before: latest.body.nextCursor })
      .expect(200)
    const oldest = await employee
      .get(url)
      .query({ limit: 2, before: older.body.nextCursor })
      .expect(200)

    const bodies = (page: { body: { messages: Message[] } }) =>
      page.body.messages.map((message) => message.body)
    expect(bodies(latest)).toEqual(['4', '5'])
    expect(bodies(older)).toEqual(['2', '3'])
    expect(bodies(oldest)).toEqual(['1'])
    expect(oldest.body.nextCursor).toBeNull()
  })

  it('reopens a closed conversation when the patient writes again', async () => {
    const conversationId = await startConversation()
    await employee
      .patch(`/conversations/${conversationId}/status`)
      .send({ status: 'closed' })
      .expect(200)

    const response = await patient
      .post('/conversations/me/messages')
      .send({ body: 'Una pregunta más' })
      .expect(201)

    expect(response.body.conversation.status).toBe('open')
  })

  it("hides other patients' conversations (404)", async () => {
    const conversationId = await startConversation()
    const other = await createPatient()
    const otherAgent = await loginAs(other.user?.email ?? '')

    await otherAgent.get(`/conversations/${conversationId}/messages`).expect(404)
    await otherAgent
      .post(`/conversations/${conversationId}/messages`)
      .send({ body: 'Hola' })
      .expect(404)
  })

  it.each(['doctor', 'admin'] as const)('is not available to %s users (403)', async (role) => {
    const user = await createUser(role)
    const agent = await loginAs(user.email)

    await agent.get('/conversations').expect(403)
  })

  it('only lets patients use /me and only staff close conversations (403)', async () => {
    const conversationId = await startConversation()

    await employee.post('/conversations/me/messages').send({ body: 'Hola' }).expect(403)
    await patient
      .patch(`/conversations/${conversationId}/status`)
      .send({ status: 'closed' })
      .expect(403)
  })

  it('rejects empty messages (400)', async () => {
    await patient.post('/conversations/me/messages').send({ body: '   ' }).expect(400)
  })

  it('never lets a message be changed or deleted', async () => {
    await startConversation()

    await expect(prisma.message.updateMany({ data: { body: 'Otro texto' } })).rejects.toThrow()
    await expect(prisma.message.deleteMany()).rejects.toThrow()
    expect(await prisma.message.count()).toBe(1)
  })
})
