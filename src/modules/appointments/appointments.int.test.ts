import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createDoctorWithService,
  createPatient,
  loginAs,
  resetDatabase,
  tomorrow,
  type TestAgent,
} from '../../test/helpers.js'
import { isDoubleBookingError } from './appointments.errors.js'

describe('appointments (integration)', () => {
  let doctorId: string
  let serviceId: string
  let patientA: Awaited<ReturnType<typeof createPatient>>
  let patientB: Awaited<ReturnType<typeof createPatient>>

  beforeEach(async () => {
    await resetDatabase()
    const { doctor, service } = await createDoctorWithService()
    doctorId = doctor.id
    serviceId = service.id
    patientA = await createPatient()
    patientB = await createPatient()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const getSlots = async (agent: TestAgent) => {
    const response = await agent
      .get('/availability')
      .query({ doctorId, serviceId, date: tomorrow() })
      .expect(200)
    return response.body.slots as { startsAt: string; endsAt: string }[]
  }

  const getFirstSlot = async (agent: TestAgent) => {
    const [slot] = await getSlots(agent)
    if (!slot) throw new Error('The test doctor has no free slots')
    return slot
  }

  it('books a free slot and removes it from the availability', async () => {
    const agent = await loginAs(patientA.user?.email ?? '')
    const slot = await getFirstSlot(agent)

    const response = await agent
      .post('/appointments')
      .send({ doctorId, serviceId, startsAt: slot.startsAt })
      .expect(201)

    expect(response.body.appointment).toMatchObject({ status: 'scheduled', time: '08:00' })
    const slotsAfter = await getSlots(agent)
    expect(slotsAfter.map((s) => s.startsAt)).not.toContain(slot.startsAt)
  })

  it('rejects a slot that is already taken (409)', async () => {
    const agentA = await loginAs(patientA.user?.email ?? '')
    const agentB = await loginAs(patientB.user?.email ?? '')
    const slot = await getFirstSlot(agentA)
    const body = { doctorId, serviceId, startsAt: slot.startsAt }

    await agentA.post('/appointments').send(body).expect(201)
    await agentB.post('/appointments').send(body).expect(409)
  })

  it('never double books when two patients book the same slot at the same moment', async () => {
    const [agentA, agentB] = await Promise.all([
      loginAs(patientA.user?.email ?? ''),
      loginAs(patientB.user?.email ?? ''),
    ])
    const slot = await getFirstSlot(agentA)
    const body = { doctorId, serviceId, startsAt: slot.startsAt }

    // Both requests are sent at the same time
    const responses = await Promise.all([
      agentA.post('/appointments').send(body),
      agentB.post('/appointments').send(body),
    ])

    expect(responses.map((response) => response.status).sort()).toEqual([201, 409])
    expect(
      await prisma.appointment.count({
        where: { doctorId, startsAt: new Date(slot.startsAt), status: 'scheduled' },
      }),
    ).toBe(1)
  })

  it('the database itself rejects overlapping appointments (EXCLUDE constraint)', async () => {
    const start = new Date(Date.now() + 48 * 60 * 60 * 1000)
    const minutes = (n: number) => new Date(start.getTime() + n * 60 * 1000)
    const base = { doctorId, serviceId, patientId: patientA.id }

    await prisma.appointment.create({ data: { ...base, startsAt: start, endsAt: minutes(30) } })

    // 15 minutes later, overlapping the first one, written directly without the API
    await expect(
      prisma.appointment.create({
        data: { ...base, patientId: patientB.id, startsAt: minutes(15), endsAt: minutes(45) },
      }),
    ).rejects.toSatisfy(isDoubleBookingError)

    // Back-to-back is allowed: one ends when the next starts
    await prisma.appointment.create({
      data: { ...base, patientId: patientB.id, startsAt: minutes(30), endsAt: minutes(60) },
    })
  })

  it('frees the slot when the appointment is cancelled', async () => {
    const agent = await loginAs(patientA.user?.email ?? '')
    const slot = await getFirstSlot(agent)
    const booked = await agent
      .post('/appointments')
      .send({ doctorId, serviceId, startsAt: slot.startsAt })
      .expect(201)

    await agent
      .patch(`/appointments/${booked.body.appointment.id}/cancel`)
      .send({ reason: 'Tengo un viaje' })
      .expect(200)

    const slotsAfter = await getSlots(agent)
    expect(slotsAfter.map((s) => s.startsAt)).toContain(slot.startsAt)
  })

  it("does not show a patient another patient's appointment (404)", async () => {
    const agentA = await loginAs(patientA.user?.email ?? '')
    const agentB = await loginAs(patientB.user?.email ?? '')
    const slot = await getFirstSlot(agentA)
    const booked = await agentA
      .post('/appointments')
      .send({ doctorId, serviceId, startsAt: slot.startsAt })
      .expect(201)

    await agentB.get(`/appointments/${booked.body.appointment.id}`).expect(404)
  })
})
