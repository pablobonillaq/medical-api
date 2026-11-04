import { z } from 'zod'

export const availabilityQuerySchema = z.object({
  doctorId: z.uuid({ error: 'Invalid doctor id' }),
  serviceId: z.uuid({ error: 'Invalid service id' }),
  date: z.iso.date({ error: 'date must use the YYYY-MM-DD format' }),
})

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>
