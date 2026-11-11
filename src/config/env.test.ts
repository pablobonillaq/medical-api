import { describe, expect, it } from 'vitest'
import { parseEnv } from './env.js'

const valid = {
  DATABASE_URL: 'postgresql://medical:medical@localhost:5433/medical_api',
  JWT_SECRET: 'a-secret-that-is-at-least-32-characters-long',
}

describe('parseEnv', () => {
  it('fills in the defaults', () => {
    expect(parseEnv(valid)).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3000,
      CLINIC_TIMEZONE: 'America/Mexico_City',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      REMINDERS_ENABLED: true,
      TRUST_PROXY: 0,
      RATE_LIMIT_ENABLED: true,
    })
  })

  it('rejects a database URL that is not PostgreSQL', () => {
    expect(() => parseEnv({ ...valid, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      'DATABASE_URL must be a PostgreSQL URL',
    )
  })

  it('rejects a short JWT secret', () => {
    expect(() => parseEnv({ ...valid, JWT_SECRET: 'short' })).toThrow(
      'JWT_SECRET must be at least 32 characters',
    )
  })

  it('rejects a time zone that does not exist', () => {
    expect(() => parseEnv({ ...valid, CLINIC_TIMEZONE: 'Mars/Olympus_Mons' })).toThrow(
      'CLINIC_TIMEZONE must be a valid IANA time zone',
    )
  })

  it('requires the SMTP user and password together', () => {
    expect(() => parseEnv({ ...valid, SMTP_USER: 'clinic' })).toThrow(
      'Set both SMTP_USER and SMTP_PASSWORD, or neither',
    )
    expect(parseEnv({ ...valid, SMTP_USER: 'clinic', SMTP_PASSWORD: 'secret' })).toMatchObject({
      SMTP_USER: 'clinic',
    })
  })
})
