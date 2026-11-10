import request from 'supertest'
import { afterAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { app } from '../test/helpers.js'
import { buildOpenApiDocument } from './openapi.js'

const METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const
const SAMPLE_ID = '00000000-0000-4000-8000-000000000000'

describe('API documentation (integration)', () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('serves the OpenAPI document', async () => {
    const response = await request(app).get('/openapi.json').expect(200)

    expect(response.body).toMatchObject({ openapi: '3.1.0', info: { title: 'Medical API' } })
  })

  it('serves Swagger UI', async () => {
    const response = await request(app).get('/docs/').expect(200)

    expect(response.text).toContain('swagger-ui')
  })

  it('is not served when disabled, as in production', async () => {
    const production = createApp({ serveDocs: false })

    await request(production).get('/docs/').expect(404)
    await request(production).get('/openapi.json').expect(404)
  })

  // A documented route that does not exist answers "Route … not found"
  it('only documents routes that exist', async () => {
    const operations = Object.entries(buildOpenApiDocument().paths ?? {}).flatMap(([path, item]) =>
      METHODS.filter((method) => item[method]).map((method) => ({
        method,
        url: path.replace(/\{[^}]+\}/g, SAMPLE_ID),
      })),
    )
    expect(operations.length).toBeGreaterThan(0)

    for (const { method, url } of operations) {
      const response = await request(app)[method](url)
      const error = (response.body as { error?: string }).error ?? ''
      expect(error, `${method.toUpperCase()} ${url}`).not.toMatch(/^Route .* not found$/)
    }
  })
})
