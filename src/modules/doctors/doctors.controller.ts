import type { RequestHandler } from 'express'
import { getAuthUser } from '../auth/auth.user.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createDoctorSchema,
  listDoctorsQuerySchema,
  setDoctorServicesSchema,
  updateDoctorSchema,
} from './doctors.schema.js'
import { doctorsService } from './doctors.service.js'

const list: RequestHandler = async (req, res) => {
  const query = listDoctorsQuerySchema.parse(req.query)
  const doctors = await doctorsService.list(query, getAuthUser(req).role)
  res.json({ doctors })
}

const getById: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const doctor = await doctorsService.getById(id, getAuthUser(req).role)
  res.json({ doctor })
}

const create: RequestHandler = async (req, res) => {
  const input = createDoctorSchema.parse(req.body)
  const doctor = await doctorsService.create(input)
  res.status(201).json({ doctor })
}

const update: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateDoctorSchema.parse(req.body)
  const doctor = await doctorsService.update(id, input)
  res.json({ doctor })
}

const setServices: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const { serviceIds } = setDoctorServicesSchema.parse(req.body)
  const doctor = await doctorsService.setServices(id, serviceIds)
  res.json({ doctor })
}

export const doctorsController = { list, getById, create, update, setServices }
