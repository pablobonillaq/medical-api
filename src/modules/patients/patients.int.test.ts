import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
  type TestAgent,
} from '../../test/helpers.js'

const walkIn = {
  firstName: 'Ramón',
  lastName: 'Soto Pérez',
  birthDate: '1958-03-14',
  phone: '(55) 8765-4321',
}

describe('patients (integration)', () => {
  let employee: TestAgent
  let admin: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    employee = await loginAs((await createUser('employee')).email)
    admin = await loginAs((await createUser('admin')).email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('lets the front desk register a patient without an account', async () => {
    const response = await employee.post('/patients').send(walkIn).expect(201)

    expect(response.body.patient).toMatchObject({
      firstName: 'Ramón',
      phone: '+525587654321',
      birthDate: '1958-03-14',
      hasAccount: false,
      email: null,
      whatsappOptIn: false,
    })
  })

  it('searches by name in any order and by phone digits, with pagination', async () => {
    await employee.post('/patients').send(walkIn).expect(201)
    await createPatient()

    const byName = await employee.get('/patients').query({ search: 'soto ramón' }).expect(200)
    const byPhone = await employee.get('/patients').query({ search: '8765' }).expect(200)
    const firstPage = await employee.get('/patients').query({ pageSize: 1 }).expect(200)

    expect(byName.body).toMatchObject({ total: 1, patients: [{ firstName: 'Ramón' }] })
    expect(byPhone.body.total).toBe(1)
    expect(firstPage.body).toMatchObject({ total: 2, page: 1, pageSize: 1 })
    expect(firstPage.body.patients).toHaveLength(1)
  })

  it('lets patients see and edit only their own profile', async () => {
    const own = await createPatient()
    const other = await createPatient()
    const agent = await loginAs(own.user?.email ?? '')

    const mine = await agent.get('/patients/me').expect(200)
    const byId = await agent.get(`/patients/${own.id}`).expect(200)
    await agent.get(`/patients/${other.id}`).expect(404)
    const updated = await agent
      .patch(`/patients/${own.id}`)
      .send({ phone: '5511112222' })
      .expect(200)
    await agent.patch(`/patients/${other.id}`).send({ phone: '5511112222' }).expect(404)

    expect(mine.body.patient).toMatchObject({ id: own.id, hasAccount: true })
    expect(byId.body.patient.email).toBe(own.user?.email)
    expect(updated.body.patient.phone).toBe('+525511112222')
  })

  it('lets staff see any patient, but admins cannot edit patient data (403)', async () => {
    const patient = await createPatient()

    await employee.get(`/patients/${patient.id}`).expect(200)
    await employee.patch(`/patients/${patient.id}`).send({ lastName: 'Méndez Ruiz' }).expect(200)
    await admin.get(`/patients/${patient.id}`).expect(200)
    await admin.patch(`/patients/${patient.id}`).send({ lastName: 'Otro' }).expect(403)
  })

  it('only lets staff list and register patients (403)', async () => {
    const patient = await createPatient()
    const agent = await loginAs(patient.user?.email ?? '')

    await agent.get('/patients').expect(403)
    await agent.post('/patients').send(walkIn).expect(403)
  })

  it('answers 404 for /me when a patient account has no profile', async () => {
    const orphan = await createUser('patient')
    const agent = await loginAs(orphan.email)

    await agent.get('/patients/me').expect(404)
  })

  it('validates the data (400)', async () => {
    await employee
      .post('/patients')
      .send({ ...walkIn, phone: '12345' })
      .expect(400)
    await employee.get('/patients').query({ search: 'a' }).expect(400)
    await employee.get('/patients/not-a-uuid').expect(400)
  })
})
