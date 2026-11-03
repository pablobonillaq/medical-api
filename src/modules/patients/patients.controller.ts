import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './patients.schema.js'
import { patientsService } from './patients.service.js'

const list: RequestHandler = async (req, res) => {
  const query = listPatientsQuerySchema.parse(req.query)
  const result = await patientsService.list(query)
  res.json(result)
}

const create: RequestHandler = async (req, res) => {
  const input = createPatientSchema.parse(req.body)
  const patient = await patientsService.create(input)
  res.status(201).json({ patient })
}

const getMine: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const patient = await patientsService.getMine(req.user)
  res.json({ patient })
}

const getById: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const { id } = idParamsSchema.parse(req.params)
  const patient = await patientsService.getById(id, req.user)
  res.json({ patient })
}

const update: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const { id } = idParamsSchema.parse(req.params)
  const input = updatePatientSchema.parse(req.body)
  const patient = await patientsService.update(id, input, req.user)
  res.json({ patient })
}

export const patientsController = { list, create, getMine, getById, update }
