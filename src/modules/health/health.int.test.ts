import request from 'supertest'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../db/prisma.js'
import { app } from '../../test/helpers.js'
import { healthChecks } from './health.routes.js'

describe('health (integration)', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('answers 200 when the database is up', async () => {
    const response = await request(app).get('/health').expect(200)

    expect(response.body).toMatchObject({ status: 'ok', database: 'up' })
  })

  it('answers 503 when the database does not respond', async () => {
    vi.spyOn(healthChecks, 'database').mockRejectedValue(new Error('connection refused'))

    const response = await request(app).get('/health').expect(503)

    expect(response.body).toMatchObject({ status: 'error', database: 'down' })
  })

  it('answers 404 with the route for unknown routes', async () => {
    const response = await request(app).get('/does-not-exist').expect(404)

    expect(response.body).toEqual({ error: 'Route GET /does-not-exist not found' })
  })

  it('answers 400 to malformed JSON', async () => {
    const response = await request(app)
      .post('/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": ')
      .expect(400)

    expect(response.body).toEqual({ error: 'Malformed JSON' })
  })
})
