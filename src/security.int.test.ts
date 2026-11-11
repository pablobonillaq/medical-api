import request from 'supertest'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { prisma } from './db/prisma.js'
import { createPatient, createUser, resetDatabase, TEST_PASSWORD } from './test/helpers.js'

// The other test files turn the limits off (vitest.config.ts); here each test gets a new app
// with its own counters
const createLimitedApp = () => createApp({ rateLimits: true })

describe('security (integration)', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('sends the security headers', async () => {
    const response = await request(createApp()).get('/health').expect(200)

    expect(response.headers['content-security-policy']).toContain("script-src 'self'")
    expect(response.headers['content-security-policy']).not.toContain('upgrade-insecure-requests')
    expect(response.headers).toMatchObject({
      'x-content-type-options': 'nosniff',
      'x-frame-options': 'SAMEORIGIN',
    })
    expect(response.headers).not.toHaveProperty('x-powered-by')
  })

  it('blocks an IP after 10 failed sign-ins, without counting the good ones', async () => {
    const app = createLimitedApp()
    const user = await createUser('employee')
    const login = (password: string) =>
      request(app).post('/auth/login').send({ email: user.email, password })

    for (let i = 0; i < 5; i += 1) await login(TEST_PASSWORD).expect(200)
    for (let i = 0; i < 10; i += 1) await login('wrong-password').expect(401)
    const blocked = await login(TEST_PASSWORD).expect(429)

    expect(blocked.body).toEqual({
      error: 'Too many failed sign-in attempts. Try again in 15 minutes.',
    })
    expect(blocked.headers['ratelimit-policy']).toBeDefined()
  })

  it('allows 5 sign-ups per hour from the same IP', async () => {
    const app = createLimitedApp()

    for (let i = 0; i < 5; i += 1) await request(app).post('/auth/register').send({}).expect(400)

    await request(app).post('/auth/register').send({}).expect(429)
  })

  it('limits uploads per user, not per IP', async () => {
    const app = createLimitedApp()
    const signIn = async () => {
      const patient = await createPatient()
      const agent = request.agent(app)
      await agent
        .post('/auth/login')
        .send({ email: patient.user?.email, password: TEST_PASSWORD })
        .expect(200)
      return { agent, url: `/patients/${patient.id}/attachments` }
    }
    const first = await signIn()
    const second = await signIn()

    // Without a file each request is rejected (400), but it still counts
    for (let i = 0; i < 30; i += 1) await first.agent.post(first.url).expect(400)
    await first.agent.post(first.url).expect(429)

    // Same IP, another user: not blocked
    await second.agent.post(second.url).expect(400)
  })

  it('caps every client at 300 requests per minute, without counting /health', async () => {
    const app = createLimitedApp()

    for (let i = 0; i < 300; i += 1) await request(app).get('/auth/me').expect(401)
    const blocked = await request(app).get('/auth/me').expect(429)

    expect(blocked.body).toEqual({ error: 'Too many requests. Please slow down.' })
    await request(app).get('/health').expect(200)
  })
})
