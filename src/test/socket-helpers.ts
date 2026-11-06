import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { io as connectClient, type Socket } from 'socket.io-client'
import request from 'supertest'
import { createSocketServer } from '../realtime/socket-server.js'
import type { ClientToServerEvents, ServerToClientEvents } from '../realtime/socket.types.js'
import { app, TEST_PASSWORD } from './helpers.js'

// Client sockets are typed from the client's point of view: they listen to server events
export type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>

// Express and Socket.IO on a real HTTP server, on a random free port
export const startSocketServer = async () => {
  const httpServer = createServer(app)
  const io = createSocketServer(httpServer)
  await new Promise<void>((resolve) => httpServer.listen(0, resolve))
  const { port } = httpServer.address() as AddressInfo
  return { io, url: `http://localhost:${port}` }
}

// Logs in over HTTP and returns "access_token=...", the cookie a browser would send back
export const loginCookie = async (email: string) => {
  const response = await request(app)
    .post('/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200)
  const [setCookie] = response.get('Set-Cookie') ?? []
  const cookie = setCookie?.split(';')[0]
  if (!cookie) throw new Error('Login did not set a cookie')
  return cookie
}

// Resolves when the socket is connected; rejects with the server's error message
export const connectSocket = (url: string, cookie?: string) =>
  new Promise<ClientSocket>((resolve, reject) => {
    const socket: ClientSocket = connectClient(url, {
      transports: ['websocket'],
      reconnection: false,
      ...(cookie ? { extraHeaders: { cookie } } : {}),
    })
    socket.once('connect', () => resolve(socket))
    socket.once('connect_error', (error) => {
      socket.close()
      reject(error)
    })
  })
