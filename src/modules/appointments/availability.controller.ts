import type { RequestHandler } from 'express'
import { availabilityQuerySchema } from './appointments.schema.js'
import { availabilityService } from './availability.service.js'

const getSlots: RequestHandler = async (req, res) => {
  const query = availabilityQuerySchema.parse(req.query)
  const availability = await availabilityService.getSlots(query)
  res.json(availability)
}

export const availabilityController = { getSlots }
