import { env } from '../../config/env.js'
import { BadRequestError, NotFoundError } from '../../shared/errors/app-error.js'
import {
  daysBetween,
  getIsoDayOfWeek,
  getLocalDate,
  getLocalTime,
  localDateTimeToUtc,
} from '../../shared/utils/timezone.js'
import { doctorsRepository } from '../doctors/doctors.repository.js'
import { schedulesRepository } from '../schedules/schedules.repository.js'
import { MAX_DAYS_AHEAD, SLOT_STEP_MINUTES } from './appointments.constants.js'
import { appointmentsRepository } from './appointments.repository.js'
import type { AvailabilityQuery } from './appointments.schema.js'
import { computeSlots } from './availability.js'

export const availabilityService = {
  async getSlots({ doctorId, serviceId, date }: AvailabilityQuery) {
    const timeZone = env.CLINIC_TIMEZONE
    const now = new Date()

    const daysAhead = daysBetween(getLocalDate(now, timeZone), date)
    if (daysAhead < 0) throw new BadRequestError('date cannot be in the past')
    if (daysAhead > MAX_DAYS_AHEAD) {
      throw new BadRequestError(`date can be at most ${MAX_DAYS_AHEAD} days ahead`)
    }

    const doctor = await doctorsRepository.findById(doctorId)
    if (!doctor?.user.active) throw new NotFoundError('Doctor not found')

    const service = doctor.services.find(({ service }) => service.id === serviceId)?.service
    if (!service?.active) throw new BadRequestError('The doctor does not offer this service')

    // The whole local day, as UTC instants
    const dayStart = localDateTimeToUtc(date, 0, timeZone)
    const dayEnd = localDateTimeToUtc(date, 24 * 60, timeZone)

    // Three independent queries: run them in parallel
    const [blocks, timeOff, appointments] = await Promise.all([
      schedulesRepository.findBlocksForDay(doctorId, getIsoDayOfWeek(date)),
      schedulesRepository.findTimeOffBetween(doctorId, dayStart, dayEnd),
      appointmentsRepository.findActiveForDoctorBetween(doctorId, dayStart, dayEnd),
    ])

    const busy = [
      ...timeOff.map(({ startsAt, endsAt }) => ({ start: startsAt, end: endsAt })),
      ...appointments.map(({ startsAt, endsAt }) => ({ start: startsAt, end: endsAt })),
    ]

    const slots = computeSlots({
      date,
      blocks,
      durationMinutes: service.durationMinutes,
      stepMinutes: SLOT_STEP_MINUTES,
      busy,
      now,
      timeZone,
    })

    return {
      date,
      timeZone,
      doctorId,
      serviceId,
      durationMinutes: service.durationMinutes,
      slots: slots.map(({ start, end }) => ({
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        time: getLocalTime(start, timeZone),
      })),
    }
  },
}
