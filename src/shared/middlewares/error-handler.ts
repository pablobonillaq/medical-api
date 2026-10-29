import type { ErrorRequestHandler, RequestHandler } from 'express'
import { z } from 'zod'
import { Prisma } from '../../generated/prisma/client.js'
import { AppError, NotFoundError } from '../errors/app-error.js'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  if (err instanceof z.ZodError) {
    res.status(400).json({ error: 'Invalid request data', details: z.flattenError(err) })    
    return
  }

  if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
    res.status(400).json({ error: 'Malformed JSON' })
    return
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Resource already exists' })
      return
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' })
      return
    }
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}