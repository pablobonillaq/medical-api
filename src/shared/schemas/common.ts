import { z } from 'zod'

export const idParamsSchema = z.object({ id: z.uuid({ error: 'Invalid id' }) })

export const hasAtLeastOneField = (data: object) =>
  Object.values(data).some((value) => value !== undefined)