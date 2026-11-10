import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { env } from '../../config/env.js'
import { prisma } from '../../db/prisma.js'
import {
  createDoctorWithService,
  createPatient,
  loginAs,
  resetDatabase,
  tomorrow,
  type TestAgent,
} from '../../test/helpers.js'
import { getLocalDate, localDateTimeToUtc } from '../../shared/utils/timezone.js'
import { MAX_DAYS_AHEAD } from './appointments.constants.js'

const DAY = 24 * 60 * 60 * 1000

// A date in clinic time, `days` days from today (negative = in the past)
const daysFromToday = (days: number) =>
  getLocalDate(new Date(Date.now() + days * DAY), env.CLINIC_TIMEZONE)

describe('availability (integration)', () => {
  let doctorId: string
  let doctorUserId: string
  let serviceId: string
  let agent: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    const { doctor, service } = await createDoctorWithService()
    doctorId = doctor.id
    doctorUserId = doctor.userId
    serviceId = service.id
    agent = await loginAs((await createPatient()).user?.email ?? '')
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const getSlots = (query: { doctorId?: string; serviceId?: string; date?: string } = {}) =>
    agent.get('/availability').query({ doctorId, serviceId, date: tomorrow(), ...query })

  it('returns 30-minute slots inside the working hours', async () => {
    const response = await getSlots().expect(200)

    expect(response.body).toMatchObject({ date: tomorrow(), durationMinutes: 30 })
    const times = (response.body.slots as { time: string }[]).map(({ time }) => time)
    expect(times[0]).toBe('08:00')
    expect(times.at(-1)).toBe('17:30')
  })

  it('removes the slots covered by time off', async () => {
    const date = tomorrow()
    await prisma.timeOff.create({
      data: {
        doctorId,
        startsAt: localDateTimeToUtc(date, 8 * 60, env.CLINIC_TIMEZONE),
        endsAt: localDateTimeToUtc(date, 12 * 60, env.CLINIC_TIMEZONE),
      },
    })

    const response = await getSlots().expect(200)

    expect(response.body.slots[0]).toMatchObject({ time: '12:00' })
  })

  it('rejects a date in the past (400)', async () => {
    const response = await getSlots({ date: daysFromToday(-1) }).expect(400)
    expect(response.body.error).toBe('date cannot be in the past')
  })

  it(`rejects a date more than ${MAX_DAYS_AHEAD} days ahead (400)`, async () => {
    await getSlots({ date: daysFromToday(MAX_DAYS_AHEAD) }).expect(200)
    await getSlots({ date: daysFromToday(MAX_DAYS_AHEAD + 1) }).expect(400)
  })

  it('returns 404 for a disabled or unknown doctor', async () => {
    await getSlots({ doctorId: '00000000-0000-4000-8000-000000000000' }).expect(404)

    await prisma.user.update({ where: { id: doctorUserId }, data: { active: false } })
    await getSlots().expect(404)
  })

  it('rejects a service the doctor does not offer, or an inactive one (400)', async () => {
    const other = await prisma.service.create({ data: { name: 'Otro', durationMinutes: 30 } })
    await getSlots({ serviceId: other.id }).expect(400)

    await prisma.service.update({ where: { id: serviceId }, data: { active: false } })
    await getSlots().expect(400)
  })
})
