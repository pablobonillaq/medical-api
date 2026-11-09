import { createApp } from './app.js'
import { env } from './config/env.js'
import { prisma } from './db/prisma.js'
import { createSocketServer } from './realtime/socket-server.js'
import { createEmailChannel } from './modules/reminders/channels/email.channel.js'
import { createReminderWorker } from './modules/reminders/reminders.worker.js'
import { mailTransport } from './shared/mail/index.js'

const app = createApp()

const server = app.listen(env.PORT, (error) => {
  if (error) throw error
  console.log(`Server listening on http://localhost:${env.PORT} (${env.NODE_ENV})`)
})

// Socket.IO shares the HTTP server (and port) with Express
const io = createSocketServer(server)

// Sends due reminders every minute. WhatsApp will be added to this list later.
const reminderWorker = createReminderWorker({
  channels: [createEmailChannel(mailTransport, env.MAIL_FROM)],
})
if (env.REMINDERS_ENABLED) reminderWorker.start()

const shutdown = async () => {
  // Lets the reminder in progress finish before closing the database connection
  await reminderWorker.stop()
  // Disconnects every socket and closes the HTTP server
  await io.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', () => void shutdown())
process.on('SIGTERM', () => void shutdown())
