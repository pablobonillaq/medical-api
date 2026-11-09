import type { RequestHandler } from 'express'
import { getAuthUser } from '../auth/auth.user.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  cancelAppointmentSchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleAppointmentSchema,
  updateAppointmentStatusSchema,
} from './appointments.schema.js'
import { appointmentsService } from './appointments.service.js'

const create: RequestHandler = async (req, res) => {
  const input = createAppointmentSchema.parse(req.body)
  const appointment = await appointmentsService.book(input, getAuthUser(req))
  res.status(201).json({ appointment })
}

const list: RequestHandler = async (req, res) => {
  const query = listAppointmentsQuerySchema.parse(req.query)
  const result = await appointmentsService.list(query, getAuthUser(req))
  res.json(result)
}

const getById: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const appointment = await appointmentsService.getById(id, getAuthUser(req))
  res.json({ appointment })
}

const cancel: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const { reason } = cancelAppointmentSchema.parse(req.body ?? {})
  const appointment = await appointmentsService.cancel(id, reason, getAuthUser(req))
  res.json({ appointment })
}

const reschedule: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const { startsAt } = rescheduleAppointmentSchema.parse(req.body)
  const appointment = await appointmentsService.reschedule(id, startsAt, getAuthUser(req))
  res.json({ appointment })
}

const updateStatus: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateAppointmentStatusSchema.parse(req.body)
  const appointment = await appointmentsService.updateStatus(id, input, getAuthUser(req))
  res.json({ appointment })
}

export const appointmentsController = { create, list, getById, cancel, reschedule, updateStatus }
