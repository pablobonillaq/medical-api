import type { ScheduleBlock } from '../../generated/prisma/client.js'
import { ConflictError, ForbiddenError, NotFoundError } from '../../shared/errors/app-error.js'
import { minutesToTime } from '../../shared/utils/time.js'
import type { PublicUser } from '../users/users.types.js'
import { schedulesRepository } from './schedules.repository.js'
import type { CreateTimeOffInput, ScheduleBlockInput } from './schedules.schema.js'

type DoctorRef = { id: string; userId: string }

const toBlockResponse = ({ id, dayOfWeek, startMinute, endMinute }: ScheduleBlock) => ({
  id,
  dayOfWeek,
  start: minutesToTime(startMinute),
  end: minutesToTime(endMinute),
})

const findDoctorOrThrow = async (doctorId: string) => {
  const doctor = await schedulesRepository.findDoctor(doctorId)
  if (!doctor) throw new NotFoundError('Doctor not found')
  return doctor
}

// The admin or the doctor themselves can change a doctor's schedule and time off
const canManage = (doctor: DoctorRef, user: PublicUser) =>
  user.role === 'admin' || doctor.userId === user.id

export const schedulesService = {
  async getSchedule(doctorId: string) {
    await findDoctorOrThrow(doctorId)
    const blocks = await schedulesRepository.findBlocks(doctorId)
    return blocks.map(toBlockResponse)
  },

  async replaceSchedule(doctorId: string, blocks: ScheduleBlockInput[], user: PublicUser) {
    const doctor = await findDoctorOrThrow(doctorId)
    if (!canManage(doctor, user)) throw new ForbiddenError()

    await schedulesRepository.replaceBlocks(
      doctorId,
      blocks.map(({ dayOfWeek, start, end }) => ({
        dayOfWeek,
        startMinute: start,
        endMinute: end,
      })),
    )
    return schedulesService.getSchedule(doctorId)
  },

  async listTimeOff(doctorId: string, user: PublicUser) {
    const doctor = await findDoctorOrThrow(doctorId)
    if (!canManage(doctor, user) && user.role !== 'employee') throw new ForbiddenError()

    return schedulesRepository.findUpcomingTimeOff(doctorId, new Date())
  },

  async createTimeOff(doctorId: string, input: CreateTimeOffInput, user: PublicUser) {
    const doctor = await findDoctorOrThrow(doctorId)
    if (!canManage(doctor, user)) throw new ForbiddenError()

    const overlapping = await schedulesRepository.findOverlappingTimeOff(
      doctorId,
      input.startsAt,
      input.endsAt,
    )
    if (overlapping) throw new ConflictError('It overlaps with another time off of this doctor')

    return schedulesRepository.createTimeOff({
      doctorId,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      reason: input.reason ?? null,
    })
  },

  async deleteTimeOff(doctorId: string, timeOffId: string, user: PublicUser) {
    const doctor = await findDoctorOrThrow(doctorId)
    if (!canManage(doctor, user)) throw new ForbiddenError()

    const timeOff = await schedulesRepository.findTimeOff(timeOffId, doctorId)
    if (!timeOff) throw new NotFoundError('Time off not found')

    await schedulesRepository.deleteTimeOff(timeOffId)
  },
}
