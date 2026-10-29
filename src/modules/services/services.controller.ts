import type { RequestHandler } from 'express'
import { NotFoundError } from '../../shared/errors/app-error.js'
import { idParamsSchema } from '../../shared/schemas/common.js'
import {
  createServiceSchema,
  listServicesQuerySchema,
  updateServiceSchema,
} from './services.schema.js'
import { servicesRepository } from './services.repository.js'

const list: RequestHandler = async (req, res) => {
  const query = listServicesQuerySchema.parse(req.query)
  const includeInactive = query.includeInactive === true && req.user?.role === 'admin'
  const services = await servicesRepository.findMany({ includeInactive })
  res.json({ services })
}

const getById: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const service = await servicesRepository.findById(id)
  if (!service) throw new NotFoundError('Service not found')
  res.json({ service })
}

const create: RequestHandler = async (req, res) => {
  const input = createServiceSchema.parse(req.body)
  const service = await servicesRepository.create(input)
  res.status(201).json({ service })
}

const update: RequestHandler = async (req, res) => {
  const { id } = idParamsSchema.parse(req.params)
  const input = updateServiceSchema.parse(req.body)
  const service = await servicesRepository.update(id, input)
  res.json({ service })
}

export const servicesController = { list, getById, create, update }