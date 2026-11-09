import type { RequestHandler } from 'express'
import { getAuthUser } from '../auth/auth.user.js'
import {
  createTimeOffSchema,
  doctorParamsSchema,
  replaceScheduleSchema,
  timeOffParamsSchema,
} from './schedules.schema.js'
import { schedulesService } from './schedules.service.js'

const getSchedule: RequestHandler = async (req, res) => {
  const { doctorId } = doctorParamsSchema.parse(req.params)
  const blocks = await schedulesService.getSchedule(doctorId)
  res.json({ blocks })
}

const replaceSchedule: RequestHandler = async (req, res) => {
  const { doctorId } = doctorParamsSchema.parse(req.params)
  const { blocks } = replaceScheduleSchema.parse(req.body)
  const schedule = await schedulesService.replaceSchedule(doctorId, blocks, getAuthUser(req))
  res.json({ blocks: schedule })
}

const listTimeOff: RequestHandler = async (req, res) => {
  const { doctorId } = doctorParamsSchema.parse(req.params)
  const timeOff = await schedulesService.listTimeOff(doctorId, getAuthUser(req))
  res.json({ timeOff })
}

const createTimeOff: RequestHandler = async (req, res) => {
  const { doctorId } = doctorParamsSchema.parse(req.params)
  const input = createTimeOffSchema.parse(req.body)
  const timeOff = await schedulesService.createTimeOff(doctorId, input, getAuthUser(req))
  res.status(201).json({ timeOff })
}

const deleteTimeOff: RequestHandler = async (req, res) => {
  const { doctorId, timeOffId } = timeOffParamsSchema.parse(req.params)
  await schedulesService.deleteTimeOff(doctorId, timeOffId, getAuthUser(req))
  res.status(204).end()
}

export const schedulesController = {
  getSchedule,
  replaceSchedule,
  listTimeOff,
  createTimeOff,
  deleteTimeOff,
}
