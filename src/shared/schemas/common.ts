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
