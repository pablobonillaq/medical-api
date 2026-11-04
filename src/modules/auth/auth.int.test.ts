import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import { app, createPatient, loginAs, resetDatabase, TEST_PASSWORD } from '../../test/helpers.js'

const newPatient = {
  email: 'luz@test.com',
  password: '12345678',
  firstName: 'Luz',
  lastName: 'Méndez',
  birthDate: '1990-05-21',
  phone: '(55) 1234-5678',
}

describe('auth (integration)', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('registers a patient: user account and profile in one request', async () => {
    const response = await request(app).post('/auth/register').send(newPatient).expect(201)

    expect(response.body.patient).toMatchObject({
      email: 'luz@test.com',
      phone: '+525512345678',
      hasAccount: true,
    })
    expect(await prisma.user.count({ where: { role: 'patient' } })).toBe(1)
    expect(await prisma.patient.count()).toBe(1)
  })

  it('rejects a second registration with the same email (409)', async () => {
    await request(app).post('/auth/register').send(newPatient).expect(201)
    await request(app).post('/auth/register').send(newPatient).expect(409)
  })

  it('never stores or returns the password', async () => {
    const response = await request(app).post('/auth/register').send(newPatient).expect(201)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: newPatient.email } })

    expect(JSON.stringify(response.body)).not.toContain('password')
    expect(user.passwordHash).not.toBe(newPatient.password)
    expect(user.passwordHash).toMatch(/^\$2b\$/)
  })

  it('logs in with an httpOnly, SameSite=Strict cookie', async () => {
    const patient = await createPatient()

    const response = await request(app)
      .post('/auth/login')
      .send({ email: patient.user?.email, password: TEST_PASSWORD })
      .expect(200)

    const cookie = String(response.headers['set-cookie'])
    expect(cookie).toContain('access_token=')
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('SameSite=Strict')
  })

  it('rejects a wrong password (401)', async () => {
    const patient = await createPatient()

    await request(app)
      .post('/auth/login')
      .send({ email: patient.user?.email, password: 'wrong-password' })
      .expect(401)
  })

  it('keeps the session until logout', async () => {
    const patient = await createPatient()
    const agent = await loginAs(patient.user?.email ?? '')

    await agent.get('/auth/me').expect(200)
    await agent.post('/auth/logout').expect(204)
    await agent.get('/auth/me').expect(401)
  })
})
