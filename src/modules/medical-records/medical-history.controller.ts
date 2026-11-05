import type { RequestHandler } from 'express'
import { getAuditContext } from '../audit/audit.types.js'
import { medicalHistoryService } from './medical-history.service.js'
import { patientIdParamsSchema, upsertMedicalHistorySchema } from './medical-records.schema.js'

const get: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const medicalHistory = await medicalHistoryService.get(patientId, getAuditContext(req))
  res.json({ medicalHistory })
}

const upsert: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const input = upsertMedicalHistorySchema.parse(req.body)
  const medicalHistory = await medicalHistoryService.upsert(patientId, input, getAuditContext(req))
  res.json({ medicalHistory })
}

export const medicalHistoryController = { get, upsert }
