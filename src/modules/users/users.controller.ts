import type { RequestHandler } from 'express'
import { UnauthorizedError } from '../../shared/errors/app-error.js'
import {
  createStaffSchema,
  listUsersQuerySchema,
  updateUserSchema,
  userIdParamsSchema,
} from './users.schema.js'
import { usersService } from './users.service.js'

const create: RequestHandler = async (req, res) => {
  const input = createStaffSchema.parse(req.body)
  const user = await usersService.createStaff(input)
  res.status(201).json({ user })
}

const list: RequestHandler = async (req, res) => {
  const query = listUsersQuerySchema.parse(req.query)
  const users = await usersService.list(query)
  res.json({ users })
}

const update: RequestHandler = async (req, res) => {
  if (!req.user) throw new UnauthorizedError()
  const { id } = userIdParamsSchema.parse(req.params)
  const input = updateUserSchema.parse(req.body)
  const user = await usersService.update(req.user.id, id, input)
  res.json({ user })
}

export const usersController = { create, list, update }