import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import type { PublicUser } from '../users/users.types.js'
import { getAuditContext } from './audit.types.js'

const user: PublicUser = {
  id: 'user-1',
  email: 'recepcion@clinica.test',
  role: 'employee',
  active: true,
  createdAt: new Date('2026-11-09T12:00:00.000Z'),
  updatedAt: new Date('2026-11-09T12:00:00.000Z'),
}

// Only the parts of an Express request that getAuditContext reads
const buildRequest = ({ ip, userAgent }: { ip?: string; userAgent?: string }) =>
  ({
    user,
    ip,
    get: (header: string) => (header.toLowerCase() === 'user-agent' ? userAgent : undefined),
  }) as unknown as Request

describe('getAuditContext', () => {
  it('takes the actor, IP and browser from the request', () => {
    expect(getAuditContext(buildRequest({ ip: '203.0.113.7', userAgent: 'Firefox' }))).toEqual({
      actor: user,
      ip: '203.0.113.7',
      userAgent: 'Firefox',
    })
  })

  it('uses null when the IP or the browser are unknown', () => {
    expect(getAuditContext(buildRequest({}))).toMatchObject({ ip: null, userAgent: null })
  })

  it('cuts very long user agents to 500 characters', () => {
    const context = getAuditContext(buildRequest({ userAgent: 'x'.repeat(2000) }))

    expect(context.userAgent).toHaveLength(500)
  })
})
