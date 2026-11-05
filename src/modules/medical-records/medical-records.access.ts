import type { AuditResource } from '../../generated/prisma/enums.js'
import { ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js'
import { auditService } from '../audit/audit.service.js'
import type { AuditContext } from '../audit/audit.types.js'
import { doctorsRepository } from '../doctors/doctors.repository.js'
import { medicalRecordsRepository } from './medical-records.repository.js'

export type DoctorAccess = { kind: 'doctor'; patientId: string; doctorId: string }
export type PatientAccess = { kind: 'patient'; patientId: string }
export type RecordAccess = DoctorAccess | PatientAccess

// Who can open a medical record: the patient themselves or a doctor who treats them.
// Admins and front desk staff never see clinical content.
export const authorizeRecordAccess = async (
  patientId: string,
  ctx: AuditContext,
  resource: AuditResource,
): Promise<RecordAccess> => {
  const { actor } = ctx
  const patient = await medicalRecordsRepository.findPatientOwner(patientId)
  if (!patient) throw new NotFoundError('Patient not found')

  if (actor.role === 'patient' && patient.userId === actor.id) {
    return { kind: 'patient', patientId }
  }

  if (actor.role === 'doctor') {
    const doctor = await doctorsRepository.findByUserId(actor.id)
    if (doctor && (await medicalRecordsRepository.hasCareRelationship(doctor.id, patientId))) {
      return { kind: 'doctor', patientId, doctorId: doctor.id }
    }
  }

  // Denied attempts are recorded too; 404 so the response does not reveal that the patient exists
  await auditService.record(ctx, { action: 'denied', resource, patientId })
  throw new NotFoundError('Patient not found')
}

// Patients can read their record but only the treating doctor can change it
export const requireTreatingDoctor = async (
  access: RecordAccess,
  ctx: AuditContext,
  resource: AuditResource,
): Promise<DoctorAccess> => {
  if (access.kind === 'doctor') return access

  await auditService.record(ctx, {
    action: 'denied',
    resource,
    patientId: access.patientId,
    details: { reason: 'read_only' },
  })
  throw new ForbiddenError('Only the treating doctor can change the medical record')
}
