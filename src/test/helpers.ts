import bcrypt from 'bcrypt'
import request from 'supertest'
import { createApp } from '../app.js'
import { env } from '../config/env.js'
import { prisma } from '../db/prisma.js'
import type { Role } from '../modules/users/users.schema.js'
import { getLocalDate } from '../shared/utils/timezone.js'

export const app = createApp()

// Every test user has this password. A low bcrypt cost keeps the tests fast.
export const TEST_PASSWORD = 'test-password'
const passwordHash = bcrypt.hashSync(TEST_PASSWORD, 4)

let sequence = 0
const next = () => ++sequence
const uniqueEmail = (prefix: string) => `${prefix}-${next()}@test.com`

// Empties every table. Each test starts from a clean database.
export const resetDatabase = () =>
  prisma.$executeRaw`TRUNCATE TABLE "appointments", "time_off", "schedule_blocks", "doctor_services", "patients", "doctors", "services", "users" CASCADE`

export const createUser = (role: Role) =>
  prisma.user.create({ data: { email: uniqueEmail(role), passwordHash, role } })

export const createPatient = () =>
  prisma.patient.create({
    data: {
      firstName: 'Luz',
      lastName: 'Méndez',
      birthDate: new Date('1990-05-21T00:00:00.000Z'),
      phone: '+525512345678',
      user: { create: { email: uniqueEmail('patient'), passwordHash, role: 'patient' } },
    },
    include: { user: true },
  })

// A doctor who offers a 30-minute service and works every day from 08:00 to 18:00,
// so the tests do not depend on the day of the week they run on
export const createDoctorWithService = async () => {
  const service = await prisma.service.create({
    data: { name: `Consulta ${next()}`, durationMinutes: 30 },
  })
  const doctor = await prisma.doctor.create({
    data: {
      firstName: 'Ana',
      lastName: 'Garay',
      specialty: 'Medicina general',
      licenseNumber: String(10_000_000 + next()),
      user: { create: { email: uniqueEmail('doctor'), passwordHash, role: 'doctor' } },
      services: { create: { serviceId: service.id } },
      schedule: {
        create: [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
          dayOfWeek,
          startMinute: 8 * 60,
          endMinute: 18 * 60,
        })),
      },
    },
    include: { user: true },
  })
  return { doctor, service }
}

// An agent keeps cookies between requests, like a browser after logging in
export const loginAs = async (email: string) => {
  const agent = request.agent(app)
  await agent.post('/auth/login').send({ email, password: TEST_PASSWORD }).expect(200)
  return agent
}

export type TestAgent = Awaited<ReturnType<typeof loginAs>>

// Tomorrow in clinic time: always in the future and inside the booking window
export const tomorrow = () =>
  getLocalDate(new Date(Date.now() + 24 * 60 * 60 * 1000), env.CLINIC_TIMEZONE)
