import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  app,
  createDoctorWithService,
  createUser,
  loginAs,
  resetDatabase,
  TEST_PASSWORD,
  type TestAgent,
} from '../../test/helpers.js'

describe('users (integration)', () => {
  let admin: TestAgent
  let adminId: string

  beforeEach(async () => {
    await resetDatabase()
    const adminUser = await createUser('admin')
    adminId = adminUser.id
    admin = await loginAs(adminUser.email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates staff accounts without returning the password', async () => {
    const response = await admin
      .post('/users')
      .send({ email: 'Recepcion@Clinica.TEST', password: TEST_PASSWORD, role: 'employee' })
      .expect(201)

    expect(response.body.user).toMatchObject({ email: 'recepcion@clinica.test', role: 'employee' })
    expect(response.body.user).not.toHaveProperty('passwordHash')
  })

  it('rejects a duplicated email (409) and roles that are not staff (400)', async () => {
    const existing = await createUser('employee')

    await admin
      .post('/users')
      .send({ email: existing.email, password: TEST_PASSWORD, role: 'employee' })
      .expect(409)
    await admin
      .post('/users')
      .send({ email: 'medico@clinica.test', password: TEST_PASSWORD, role: 'doctor' })
      .expect(400)
  })

  it('lists every user or only one role', async () => {
    await createUser('employee')
    await createUser('patient')

    const all = await admin.get('/users').expect(200)
    const employees = await admin.get('/users').query({ role: 'employee' }).expect(200)

    expect(all.body.users).toHaveLength(3)
    expect(employees.body.users).toHaveLength(1)
  })

  it('changes the role of a staff account', async () => {
    const employee = await createUser('employee')

    const response = await admin.patch(`/users/${employee.id}`).send({ role: 'admin' }).expect(200)

    expect(response.body.user.role).toBe('admin')
  })

  it('disables an account, which then cannot log in (403)', async () => {
    const employee = await createUser('employee')

    await admin.patch(`/users/${employee.id}`).send({ active: false }).expect(200)

    const login = await request(app)
      .post('/auth/login')
      .send({ email: employee.email, password: TEST_PASSWORD })
      .expect(403)
    expect(login.body).toEqual({ error: 'Account is disabled' })
  })

  it('does not change the role of doctor and patient accounts (400)', async () => {
    const { doctor } = await createDoctorWithService()

    await admin.patch(`/users/${doctor.userId}`).send({ role: 'employee' }).expect(400)
  })

  it('does not let admins modify their own account (403)', async () => {
    await admin.patch(`/users/${adminId}`).send({ active: false }).expect(403)
  })

  it('answers 404 for a user that does not exist', async () => {
    await admin
      .patch('/users/0190a7b2-0000-7000-8000-000000000000')
      .send({ active: false })
      .expect(404)
  })

  it('is only for admins (403)', async () => {
    const employee = await loginAs((await createUser('employee')).email)

    await employee.get('/users').expect(403)
  })
})
