import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Prisma } from '../../generated/prisma/client.js'
import { ConflictError } from '../errors/app-error.js'
import { errorHandler, notFoundHandler } from './error-handler.js'

// NextFunction has several overloads that vi.fn() cannot type, so the mock is cast once here
const createNext = () => vi.fn<(error?: unknown) => void>()
const asNext = (next: ReturnType<typeof createNext>) => next as unknown as NextFunction

// A minimal Express response that remembers the status and body it was given
const createResponse = (headersSent = false) => {
  const res = {
    headersSent,
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      res.statusCode = code
      return res
    },
    json(body: unknown) {
      res.body = body
      return res
    },
  }
  return res
}

const handle = (error: unknown, res = createResponse()) => {
  const next = createNext()
  errorHandler(error, {} as Request, res as unknown as Response, asNext(next))
  return { res, next }
}

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('Database error', { code, clientVersion: 'test' })

describe('errorHandler', () => {
  it('uses the status code of application errors', () => {
    const { res } = handle(new ConflictError('Email is already registered'))

    expect(res.statusCode).toBe(409)
    expect(res.body).toEqual({ error: 'Email is already registered' })
  })

  it('answers 400 with the details of a validation error', () => {
    const result = z.object({ email: z.email() }).safeParse({ email: 'nope' })

    const { res } = handle(result.error)

    expect(res.statusCode).toBe(400)
    expect(res.body).toMatchObject({
      error: 'Invalid request data',
      details: { fieldErrors: { email: expect.any(Array) } },
    })
  })

  it('answers 409 to a unique constraint violation and 404 to a missing record', () => {
    expect(handle(prismaError('P2002')).res.statusCode).toBe(409)
    expect(handle(prismaError('P2025')).res.statusCode).toBe(404)
  })

  it('hides unexpected errors behind a 500', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    const unknown = handle(new Error('secret connection string'))
    const otherPrisma = handle(prismaError('P2003'))

    expect(unknown.res.statusCode).toBe(500)
    expect(unknown.res.body).toEqual({ error: 'Internal server error' })
    expect(otherPrisma.res.statusCode).toBe(500)
    expect(consoleError).toHaveBeenCalledTimes(2)
  })

  it('leaves the error to Express when the response already started', () => {
    const error = new Error('stream broke')

    const { res, next } = handle(error, createResponse(true))

    expect(next).toHaveBeenCalledWith(error)
    expect(res.body).toBeUndefined()
  })
})

describe('notFoundHandler', () => {
  it('passes a 404 error with the method and route', () => {
    const next = createNext()

    notFoundHandler(
      { method: 'DELETE', originalUrl: '/nope' } as Request,
      {} as Response,
      asNext(next),
    )

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, message: 'Route DELETE /nope not found' }),
    )
  })
})
