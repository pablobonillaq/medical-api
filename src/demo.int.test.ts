import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { app } from './test/helpers.js'

describe('demo pages (integration)', () => {
  it('serves the chat demo page outside production', async () => {
    const response = await request(app).get('/demo/chat.html').expect(200)

    expect(response.headers['content-type']).toContain('text/html')
    expect(response.text).toContain('/socket.io/socket.io.js')
  })
})
