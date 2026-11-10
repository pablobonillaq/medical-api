import { describe, expect, it } from 'vitest'
import type { MedicalHistoryWithAuthor } from './medical-records.repository.js'
import { toMedicalHistoryResponse } from './medical-records.types.js'

const NOW = new Date('2026-11-09T12:00:00.000Z')

const buildHistory = (
  doctor: MedicalHistoryWithAuthor['updatedBy']['doctor'],
): MedicalHistoryWithAuthor => ({
  id: 'history-1',
  patientId: 'patient-1',
  bloodType: 'O+',
  allergies: 'Penicilina',
  chronicConditions: null,
  currentMedications: null,
  surgicalHistory: null,
  familyHistory: null,
  updatedById: 'user-1',
  createdAt: NOW,
  updatedAt: NOW,
  updatedBy: { id: 'user-1', doctor },
})

describe('toMedicalHistoryResponse', () => {
  it("shows the author's name and hides the internal author id", () => {
    const response = toMedicalHistoryResponse(buildHistory({ firstName: 'Ana', lastName: 'Garay' }))

    expect(response.updatedBy).toEqual({ userId: 'user-1', name: 'Ana Garay' })
    expect(response).not.toHaveProperty('updatedById')
  })

  it('leaves the name empty when the author has no doctor profile', () => {
    const response = toMedicalHistoryResponse(buildHistory(null))

    expect(response.updatedBy).toEqual({ userId: 'user-1', name: null })
  })
})
