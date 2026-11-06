import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../db/prisma.js'
import { createPatient, createUser, resetDatabase } from '../test/helpers.js'
import {
  connectSocket,
  loginCookie,
  startSocketServer,
  type ClientSocket,
} from '../test/socket-helpers.js'
import { STAFF_ROOM, userRoom } from './rooms.js'
import type { AppServer } from './socket.types.js'

describe('socket server (integration)', () => {
  let io: AppServer
  let url: string
  const openSockets: ClientSocket[] = []

  beforeAll(async () => {
    const server = await startSocketServer()
    io = server.io
    url = server.url
  })

  beforeEach(async () => {
    await resetDatabase()
  })

  afterEach(() => {
    for (const socket of openSockets.splice(0)) socket.close()
  })

  afterAll(async () => {
    await io.close()
    await prisma.$disconnect()
  })

  const connect = async (cookie?: string) => {
    const socket = await connectSocket(url, cookie)
    openSockets.push(socket)
    return socket
  }

  it('accepts a patient with the login cookie and joins their user room', async () => {
    const patient = await createPatient()
    const userId = patient.user?.id ?? ''

    const socket = await connect(await loginCookie(patient.user?.email ?? ''))

    expect(socket.connected).toBe(true)
    expect(await io.in(userRoom(userId)).fetchSockets()).toHaveLength(1)
    expect(await io.in(STAFF_ROOM).fetchSockets()).toHaveLength(0)
  })

  it('puts every front desk socket in the staff room', async () => {
    const employee = await createUser('employee')
    const cookie = await loginCookie(employee.email)

    // Two tabs open at the same time
    await connect(cookie)
    await connect(cookie)

    expect(await io.in(STAFF_ROOM).fetchSockets()).toHaveLength(2)
  })

  it('rejects a connection without a session', async () => {
    await expect(connect()).rejects.toThrow('Authentication required')
  })

  it('rejects an invalid token', async () => {
    await expect(connect('access_token=not-a-jwt')).rejects.toThrow('Invalid or expired session')
  })

  it.each(['doctor', 'admin'] as const)('rejects %s users', async (role) => {
    const user = await createUser(role)

    await expect(connect(await loginCookie(user.email))).rejects.toThrow(
      'The chat is only available to patients and front desk staff',
    )
  })

  it('rejects a disabled account even with a valid cookie', async () => {
    const employee = await createUser('employee')
    const cookie = await loginCookie(employee.email)
    await prisma.user.update({ where: { id: employee.id }, data: { active: false } })

    await expect(connect(cookie)).rejects.toThrow('Invalid or expired session')
  })
})
