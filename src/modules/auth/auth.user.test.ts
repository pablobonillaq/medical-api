import type { Request } from 'express'
import { describe, expect, it } from 'vitest'
import type { PublicUser } from '../users/users.types.js'
import { getAuthUser } from './auth.user.js'

const user: PublicUser = {
  id: 'user-1',
  email: 'ana@test.com',
  role: 'doctor',
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('getAuthUser', () => {
  it('returns the user set by authenticate()', () => {
    expect(getAuthUser({ user } as Request)).toBe(user)
  })

  it('fails with 401 on a route that is not behind authenticate()', () => {
    expect(() => getAuthUser({} as Request)).toThrow('Authentication required')
  })
})
