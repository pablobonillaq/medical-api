import { z } from 'zod'
import type { ZodOpenApiRequestBodyObject, ZodOpenApiResponsesObject } from 'zod-openapi'

// Every error response has this shape (see shared/middlewares/error-handler.ts)
const errorSchema = z
  .object({
    error: z.string().meta({ examples: ['Invalid request data'] }),
    details: z
      .object({
        formErrors: z.array(z.string()),
        fieldErrors: z.record(z.string(), z.array(z.string())),
      })
      .optional()
      .meta({ description: 'Only in 400 responses: what is wrong with each field' }),
  })
  .meta({ id: 'Error' })

const ERROR_DESCRIPTIONS = {
  400: 'Invalid request data',
  401: 'Not signed in, or the session expired',
  403: 'Signed in, but not allowed to do this',
  404: 'Not found, or not visible to this user',
  409: 'Conflicts with the current data',
  413: 'The file is too large',
  415: 'The file type is not allowed',
  429: 'Too many requests: wait for the time in the RateLimit header',
} as const

type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS

// The error responses an operation can return, e.g. ...errors(400, 401, 404)
export const errors = (...statuses: ErrorStatus[]): ZodOpenApiResponsesObject =>
  Object.fromEntries(
    statuses.map((status) => [
      status,
      {
        description: ERROR_DESCRIPTIONS[status],
        content: { 'application/json': { schema: errorSchema } },
      },
    ]),
  )

// A required JSON request body validated by this Zod schema
export const jsonBody = (schema: z.ZodType): ZodOpenApiRequestBodyObject => ({
  required: true,
  content: { 'application/json': { schema } },
})
