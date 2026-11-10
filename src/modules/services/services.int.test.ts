import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import { createUser, loginAs, resetDatabase, type TestAgent } from '../../test/helpers.js'

describe('services (integration)', () => {
  let admin: TestAgent
  let employee: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    admin = await loginAs((await createUser('admin')).email)
    employee = await loginAs((await createUser('employee')).email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const createService = async (name = 'Consulta general', durationMinutes = 30) => {
    const response = await admin.post('/services').send({ name, durationMinutes }).expect(201)
    return response.body.service as { id: string; name: string }
  }

  it('lets the admin create a service', async () => {
    const response = await admin
      .post('/services')
      .send({ name: 'Ultrasonido', description: 'Abdominal', durationMinutes: 45 })
      .expect(201)

    expect(response.body.service).toMatchObject({
      name: 'Ultrasonido',
      description: 'Abdominal',
      durationMinutes: 45,
      active: true,
    })
  })

  it('rejects a duplicated name (409) and invalid durations (400)', async () => {
    await createService('Consulta general')

    await admin
      .post('/services')
      .send({ name: 'Consulta general', durationMinutes: 30 })
      .expect(409)
    await admin.post('/services').send({ name: 'Rara', durationMinutes: 7 }).expect(400)
  })

  it('hides inactive services, except for the admin when asked', async () => {
    const service = await createService()
    await createService('Ultrasonido', 45)
    await admin.patch(`/services/${service.id}`).send({ active: false }).expect(200)

    const forStaff = await employee.get('/services').query({ includeInactive: true }).expect(200)
    const forAdmin = await admin.get('/services').query({ includeInactive: true }).expect(200)

    expect(forStaff.body.services).toHaveLength(1)
    expect(forAdmin.body.services).toHaveLength(2)
  })

  it('gets one service, or 404', async () => {
    const service = await createService()

    const response = await employee.get(`/services/${service.id}`).expect(200)
    await employee.get('/services/0190a7b2-0000-7000-8000-000000000000').expect(404)

    expect(response.body.service.name).toBe('Consulta general')
  })

  it('updates only the fields sent, and clears the description with null', async () => {
    const service = await createService()
    await admin.patch(`/services/${service.id}`).send({ description: 'Primera vez' }).expect(200)

    const renamed = await admin
      .patch(`/services/${service.id}`)
      .send({ name: 'Consulta de primera vez' })
      .expect(200)
    const cleared = await admin
      .patch(`/services/${service.id}`)
      .send({ description: null })
      .expect(200)

    expect(renamed.body.service).toMatchObject({
      name: 'Consulta de primera vez',
      description: 'Primera vez',
      durationMinutes: 30,
    })
    expect(cleared.body.service.description).toBeNull()
  })

  it('answers 404 when updating a service that does not exist', async () => {
    await admin
      .patch('/services/0190a7b2-0000-7000-8000-000000000000')
      .send({ active: true })
      .expect(404)
  })

  it('only lets the admin create and change services (403)', async () => {
    const service = await createService()

    await employee.post('/services').send({ name: 'Otra', durationMinutes: 30 }).expect(403)
    await employee.patch(`/services/${service.id}`).send({ active: false }).expect(403)
  })
})
