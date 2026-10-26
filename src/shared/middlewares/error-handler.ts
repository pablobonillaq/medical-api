import type { ErrorRequestHandler, RequestHandler } from 'express'
import { AppError, NotFoundError } from '../errors/app-error.js'

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`))
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
}
