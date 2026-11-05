import { prisma } from '../../db/prisma.js'
import { auditService } from '../audit/audit.service.js'
import type { AuditContext } from '../audit/audit.types.js'
import { authorizeRecordAccess, requireTreatingDoctor } from './medical-records.access.js'
import { medicalRecordsRepository } from './medical-records.repository.js'
import type { UpsertMedicalHistoryInput } from './medical-records.schema.js'
import { toMedicalHistoryResponse } from './medical-records.types.js'

const RESOURCE = 'medical_history'

// Names of the fields whose value changes. Only names go to the audit log, never values.
const changedFields = (
  before: Partial<Record<keyof UpsertMedicalHistoryInput, unknown>> | null,
  after: UpsertMedicalHistoryInput,
) =>
  (Object.keys(after) as (keyof UpsertMedicalHistoryInput)[]).filter(
    (field) => (before?.[field] ?? null) !== after[field],
  )

export const medicalHistoryService = {
  async get(patientId: string, ctx: AuditContext) {
    await authorizeRecordAccess(patientId, ctx, RESOURCE)

    const history = await medicalRecordsRepository.findHistory(patientId)
    // The read is recorded before any data leaves the API
    await auditService.record(ctx, {
      action: 'read',
      resource: RESOURCE,
      patientId,
      resourceId: history?.id,
    })
    return history ? toMedicalHistoryResponse(history) : null
  },

  async upsert(patientId: string, input: UpsertMedicalHistoryInput, ctx: AuditContext) {
    const access = await authorizeRecordAccess(patientId, ctx, RESOURCE)
    await requireTreatingDoctor(access, ctx, RESOURCE)

    // The change and its audit entry are saved together, or neither is
    const history = await prisma.$transaction(async (tx) => {
      const before = await medicalRecordsRepository.findHistory(patientId, tx)
      const saved = await medicalRecordsRepository.upsertHistory(patientId, input, ctx.actor.id, tx)
      await auditService.record(
        ctx,
        {
          action: before ? 'update' : 'create',
          resource: RESOURCE,
          patientId,
          resourceId: saved.id,
          details: { changedFields: changedFields(before, input) },
        },
        tx,
      )
      return saved
    })

    return toMedicalHistoryResponse(history)
  },
}
