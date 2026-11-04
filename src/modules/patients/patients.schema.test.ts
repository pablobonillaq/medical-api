import { describe, expect, it } from 'vitest'
import { createPatientSchema, updatePatientSchema } from './patients.schema.js'

const validPatient = {
  firstName: 'Luz',
  lastName: 'Méndez',
  birthDate: '1990-05-21',
  phone: '5512345678',
}

describe('createPatientSchema', () => {
  it('normalizes Mexican phone numbers to E.164', () => {
    for (const phone of ['5512345678', '55 1234 5678', '(55) 1234-5678', '+52 55 1234 5678']) {
      const result = createPatientSchema.parse({ ...validPatient, phone })
      expect(result.phone).toBe('+525512345678')
    }
  })

  it('rejects phone numbers that do not have 10 digits', () => {
    const result = createPatientSchema.safeParse({ ...validPatient, phone: '12345' })
    expect(result.success).toBe(false)
  })

  it('rejects a birth date in the future', () => {
    const result = createPatientSchema.safeParse({ ...validPatient, birthDate: '2999-01-01' })
    expect(result.success).toBe(false)
  })

  it('sets whatsappOptIn to false when it is not sent', () => {
    expect(createPatientSchema.parse(validPatient).whatsappOptIn).toBe(false)
  })
})

describe('updatePatientSchema', () => {
  // Regression test: a PATCH must not reset the WhatsApp consent with a default value
  it('does not add whatsappOptIn when only another field is sent', () => {
    const result = updatePatientSchema.parse({ phone: '55 8765 4321' })
    expect(result).toEqual({ phone: '+525587654321' })
  })

  it('rejects an empty update', () => {
    expect(updatePatientSchema.safeParse({}).success).toBe(false)
  })
})
