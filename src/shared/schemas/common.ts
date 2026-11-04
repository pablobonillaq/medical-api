import { z } from 'zod'

export const idParamsSchema = z.object({ id: z.uuid({ error: 'Invalid id' }) })

export const hasAtLeastOneField = (data: object) =>
  Object.values(data).some((value) => value !== undefined)

export const personNameSchema = (field: string) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(2, { error: `${field} must be at least 2 characters` })
    .max(80, { error: `${field} must be at most 80 characters` })

// Date and time with an explicit time zone: "2026-11-09T09:00:00-06:00" or "2026-11-09T15:00:00Z"
export const isoDateTimeSchema = z.iso
  .datetime({
    offset: true,
    error: 'Use an ISO 8601 date with time zone, e.g. 2026-12-24T00:00:00-06:00',
  })
  .transform((value) => new Date(value))

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1, { error: 'page must be 1 or greater' }).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, { error: 'pageSize must be between 1 and 100' })
    .max(100, { error: 'pageSize must be between 1 and 100' })
    .default(20),
})

export const toSkipTake = ({ page, pageSize }: { page: number; pageSize: number }) => ({
  skip: (page - 1) * pageSize,
  take: pageSize,
})
