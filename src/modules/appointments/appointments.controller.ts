import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from './appointments.schema.js'
import { appointmentsService } from './appointments.service.js'

const create: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const input = createAppointmentSchema.parse(req.body)
  const appointment = await appointmentsService.book(input, req.user)
  res.status(201).json({ appointment })
}

const list: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const query = listAppointmentsQuerySchema.parse(req.query)
  const result = await appointmentsService.list(query, req.user)
  res.json(result)
}

const getById: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const { id } = idParamsSchema.parse(req.params)
  const appointment = await appointmentsService.getById(id, req.user)
  res.json({ appointment })
}

const cancel: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const { id } = idParamsSchema.parse(req.params)
  const { reason } = cancelAppointmentSchema.parse(req.body ?? {})
  const appointment = await appointmentsService.cancel(id, reason, req.user)
  res.json({ appointment })
}

export const appointmentsController = { create, list, getById, cancel }
