import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { auditService } from '../audit/audit.service.js'
import type { AuditContext } from '../audit/audit.types.js'
import { doctorsRepository } from '../doctors/doctors.repository.js'
import type { PublicUser } from '../users/users.types.js'
import { authorizeRecordAccess, requireTreatingDoctor } from './medical-records.access.js'
import { medicalRecordsRepository } from './medical-records.repository.js'

const NOW = new Date('2026-11-09T12:00:00.000Z')
const PATIENT_ID = 'patient-1'

const buildContext = (role: PublicUser['role'], id: string): AuditContext => ({
  actor: { id, email: `${id}@test.com`, role, active: true, createdAt: NOW, updatedAt: NOW },
  ip: '127.0.0.1',
  userAgent: 'vitest',
})

const ownerCtx = buildContext('patient', 'patient-user')
const otherPatientCtx = buildContext('patient', 'other-patient-user')
const doctorCtx = buildContext('doctor', 'doctor-user')
const adminCtx = buildContext('admin', 'admin-user')
const employeeCtx = buildContext('employee', 'employee-user')

let recordAudit: MockInstance<typeof auditService.record>

beforeEach(() => {
  vi.spyOn(medicalRecordsRepository, 'findPatientOwner').mockResolvedValue({
    id: PATIENT_ID,
    userId: ownerCtx.actor.id,
  })
  vi.spyOn(doctorsRepository, 'findByUserId').mockResolvedValue({ id: 'doctor-1' })
  vi.spyOn(medicalRecordsRepository, 'hasCareRelationship').mockResolvedValue(true)
  recordAudit = vi.spyOn(auditService, 'record').mockResolvedValue({ id: 'audit-1' })
})

describe('authorizeRecordAccess', () => {
  it('lets patients open their own record', async () => {
    const access = await authorizeRecordAccess(PATIENT_ID, ownerCtx, 'clinical_note')

    expect(access).toEqual({ kind: 'patient', patientId: PATIENT_ID })
    expect(recordAudit).not.toHaveBeenCalled()
  })

  it('lets a doctor who treats the patient open the record', async () => {
    const access = await authorizeRecordAccess(PATIENT_ID, doctorCtx, 'clinical_note')

    expect(access).toEqual({ kind: 'doctor', patientId: PATIENT_ID, doctorId: 'doctor-1' })
  })

  it('denies a doctor without appointments with the patient and records the attempt', async () => {
    vi.spyOn(medicalRecordsRepository, 'hasCareRelationship').mockResolvedValue(false)

    await expect(
      authorizeRecordAccess(PATIENT_ID, doctorCtx, 'medical_history'),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(recordAudit).toHaveBeenCalledWith(doctorCtx, {
      action: 'denied',
      resource: 'medical_history',
      patientId: PATIENT_ID,
    })
  })

  it.each([
    ['another patient', otherPatientCtx],
    ['an admin', adminCtx],
    ['an employee', employeeCtx],
  ])('denies %s and records the attempt', async (_label, ctx) => {
    await expect(authorizeRecordAccess(PATIENT_ID, ctx, 'clinical_note')).rejects.toMatchObject({
      statusCode: 404,
    })
    expect(recordAudit).toHaveBeenCalledWith(ctx, {
      action: 'denied',
      resource: 'clinical_note',
      patientId: PATIENT_ID,
    })
  })

  it('returns 404 without an audit entry when the patient does not exist', async () => {
    vi.spyOn(medicalRecordsRepository, 'findPatientOwner').mockResolvedValue(null)

    await expect(
      authorizeRecordAccess(PATIENT_ID, doctorCtx, 'clinical_note'),
    ).rejects.toMatchObject({ statusCode: 404 })
    expect(recordAudit).not.toHaveBeenCalled()
  })
})

describe('requireTreatingDoctor', () => {
  it('allows the treating doctor', async () => {
    const access = { kind: 'doctor', patientId: PATIENT_ID, doctorId: 'doctor-1' } as const

    await expect(requireTreatingDoctor(access, doctorCtx, 'medical_history')).resolves.toEqual(
      access,
    )
  })

  it('rejects the patient with 403 and records the attempt', async () => {
    const access = { kind: 'patient', patientId: PATIENT_ID } as const

    await expect(requireTreatingDoctor(access, ownerCtx, 'medical_history')).rejects.toMatchObject({
      statusCode: 403,
    })
    expect(recordAudit).toHaveBeenCalledWith(ownerCtx, {
      action: 'denied',
      resource: 'medical_history',
      patientId: PATIENT_ID,
      details: { reason: 'read_only' },
    })
  })
})
