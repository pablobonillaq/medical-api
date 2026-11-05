import type { RequestHandler } from 'express'
import { getAuditContext } from '../audit/audit.types.js'
import { clinicalNotesService } from './clinical-notes.service.js'
import {
  amendClinicalNoteSchema,
  createClinicalNoteSchema,
  listNotesQuerySchema,
  noteParamsSchema,
  patientIdParamsSchema,
} from './medical-records.schema.js'

const list: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const query = listNotesQuerySchema.parse(req.query)
  const result = await clinicalNotesService.list(patientId, query, getAuditContext(req))
  res.json(result)
}

const getById: RequestHandler = async (req, res) => {
  const { patientId, noteId } = noteParamsSchema.parse(req.params)
  const note = await clinicalNotesService.getById(patientId, noteId, getAuditContext(req))
  res.json({ note })
}

const create: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const input = createClinicalNoteSchema.parse(req.body)
  const note = await clinicalNotesService.create(patientId, input, getAuditContext(req))
  res.status(201).json({ note })
}

const amend: RequestHandler = async (req, res) => {
  const { patientId, noteId } = noteParamsSchema.parse(req.params)
  const input = amendClinicalNoteSchema.parse(req.body)
  const note = await clinicalNotesService.amend(patientId, noteId, input, getAuditContext(req))
  res.status(201).json({ note })
}

export const clinicalNotesController = { list, getById, create, amend }
