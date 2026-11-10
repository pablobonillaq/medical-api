import { z } from 'zod'
import { isoDateTimeSchema } from '../../shared/schemas/common.js'
import { minutesToTime, TIME_OF_DAY_REGEX, timeToMinutes } from '../../shared/utils/time.js'

const timeOfDay = z
  .string({ error: 'Time is required' })
  .regex(TIME_OF_DAY_REGEX, { error: 'Time must use the HH:mm format (00:00 to 23:59)' })
  .transform(timeToMinutes)
  .refine((minutes) => minutes % 5 === 0, { error: 'Times must be multiples of 5 minutes' })

const scheduleBlockSchema = z
  .object({
    dayOfWeek: z
      .number({ error: 'dayOfWeek must be a number' })
      .int()
      .min(1, { error: 'dayOfWeek must be between 1 (Monday) and 7 (Sunday)' })
      .max(7, { error: 'dayOfWeek must be between 1 (Monday) and 7 (Sunday)' }),
    start: timeOfDay,
    end: timeOfDay,
  })
  .refine((block) => block.start < block.end, {
    error: 'end must be after start',
    path: ['end'],
  })

export const replaceScheduleSchema = z.object({
  blocks: z
    .array(scheduleBlockSchema, { error: 'blocks must be an array' })
    .max(50, { error: 'A schedule can have at most 50 blocks' })
    .superRefine((blocks, ctx) => {
      const sorted = [...blocks].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start - b.start)
      sorted.forEach((current, i) => {
        const previous = sorted[i - 1]
        if (previous?.dayOfWeek === current.dayOfWeek && current.start < previous.end) {
          ctx.addIssue({
            code: 'custom',
            message: `Blocks overlap on day ${current.dayOfWeek}: ${minutesToTime(previous.start)}–${minutesToTime(previous.end)} and ${minutesToTime(current.start)}–${minutesToTime(current.end)}`,
          })
        }
      })
    }),
})

export const createTimeOffSchema = z
  .object({
    startsAt: isoDateTimeSchema,
    endsAt: isoDateTimeSchema,
    reason: z
      .string()
      .trim()
      .max(200, { error: 'reason must be at most 200 characters' })
      .optional(),
  })
  .refine((data) => data.startsAt < data.endsAt, {
    error: 'endsAt must be after startsAt',
    path: ['endsAt'],
  })
  .refine((data) => data.endsAt > new Date(), {
    error: 'Time off must end in the future',
    path: ['endsAt'],
  })

export const doctorParamsSchema = z.object({ doctorId: z.uuid({ error: 'Invalid doctor id' }) })
export const timeOffParamsSchema = doctorParamsSchema.extend({
  timeOffId: z.uuid({ error: 'Invalid time off id' }),
})

export type ScheduleBlockInput = z.infer<typeof scheduleBlockSchema>
export type CreateTimeOffInput = z.infer<typeof createTimeOffSchema>
