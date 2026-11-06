import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'
import { createSocketServer } from './realtime/socket-server.js'

const app = createApp()

const server = app.listen(env.PORT, (error) => {
  if (error) throw error
  console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`)
})

// Socket.IO shares the HTTP server (and port) with Express
const io = createSocketServer(server)

const shutdown = async () => {
  // Disconnects every socket and closes the HTTP server
  await io.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
