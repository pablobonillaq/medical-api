import { env } from '../../config/env.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import { getLocalDate } from '../../shared/utils/timezone.js'
import { doctorsRepository } from '../doctors/doctors.repository.js'
import { patientsRepository } from '../patients/patients.repository.js'
import type { PublicUser } from '../users/users.types.js'
import { ACTIVE_STATUSES, MIN_CANCEL_NOTICE_HOURS } from './appointments.constants.js'
import { isDoubleBookingError } from './appointments.errors.js'
import { appointmentsRepository, type AppointmentWithRelations } from './appointments.repository.js'
import type { CreateAppointmentInput, ListAppointmentsQuery } from './appointments.schema.js'
import { toAppointmentResponse } from './appointments.types.js'
import { availabilityService } from './availability.service.js'

const isStaff = (user: PublicUser) => user.role === 'admin' || user.role === 'employee'

const isActive = (status: string) => (ACTIVE_STATUSES as readonly string[]).includes(status)

// Staff see every appointment; patients and doctors only their own
const canAccess = (appointment: AppointmentWithRelations, user: PublicUser) =>
  isStaff(user) || appointment.patient.userId === user.id || appointment.doctor.userId === user.id

const findAccessibleOrThrow = async (id: string, user: PublicUser) => {
  const appointment = await appointmentsRepository.findById(id)
  if (!appointment || !canAccess(appointment, user)) {
    throw new NotFoundError('Appointment not found')
  }
  return appointment
}

// Patients always book for themselves; staff must say for which patient
const resolvePatientId = async (input: CreateAppointmentInput, user: PublicUser) => {
  if (user.role === 'patient') {
    const patient = await patientsRepository.findByUserId(user.id)
    if (!patient) throw new NotFoundError('Patient profile not found')
    if (input.patientId && input.patientId !== patient.id) {
      throw new ForbiddenError('Patients can only book appointments for themselves')
    }
    return patient.id
  }

  if (!input.patientId) throw new BadRequestError('patientId is required')
  if (!(await patientsRepository.findById(input.patientId))) {
    throw new NotFoundError('Patient not found')
  }
  return input.patientId
}

export const appointmentsService = {
  async book(input: CreateAppointmentInput, user: PublicUser) {
    const patientId = await resolvePatientId(input, user)

    // The requested start must be one of the free slots computed for that day
    const { slots } = await availabilityService.getSlots({
      doctorId: input.doctorId,
      serviceId: input.serviceId,
      date: getLocalDate(input.startsAt, env.CLINIC_TIMEZONE),
    })
    const slot = slots.find(({ startsAt }) => startsAt === input.startsAt.toISOString())
    if (!slot) throw new ConflictError('The requested time is not available')

    const startsAt = new Date(slot.startsAt)
    const endsAt = new Date(slot.endsAt)

    if (await appointmentsRepository.findActiveForPatientBetween(patientId, startsAt, endsAt)) {
      throw new ConflictError('The patient already has an appointment at that time')
    }

    try {
      const appointment = await appointmentsRepository.create({
        patientId,
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        startsAt,
        endsAt,
        notes: input.notes ?? null,
        createdById: user.id,
      })
      return toAppointmentResponse(appointment)
    } catch (error) {
      // Two requests booked the same slot at the same moment: the database kept only one
      if (isDoubleBookingError(error)) {
        throw new ConflictError('This time slot was just booked, please choose another one')
      }
      throw error
    }
  },

  async list(query: ListAppointmentsQuery, user: PublicUser) {
    const where: Prisma.AppointmentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.doctorId ? { doctorId: query.doctorId } : {}),
      ...(query.patientId ? { patientId: query.patientId } : {}),
      ...(query.from || query.to
        ? {
            startsAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lt: query.to } : {}),
            },
          }
        : {}),
    }

    // Patients and doctors only see their own appointments, whatever filters they send
    if (user.role === 'patient') {
      const patient = await patientsRepository.findByUserId(user.id)
      if (!patient) throw new NotFoundError('Patient profile not found')
      where.patientId = patient.id
    }
    if (user.role === 'doctor') {
      const doctor = await doctorsRepository.findByUserId(user.id)
      if (!doctor) throw new NotFoundError('Doctor profile not found')
      where.doctorId = doctor.id
    }

    const { page, pageSize } = query
    const [appointments, total] = await appointmentsRepository.findMany({
      where,
      ...toSkipTake({ page, pageSize }),
    })
    return { appointments: appointments.map(toAppointmentResponse), page, pageSize, total }
  },

  async getById(id: string, user: PublicUser) {
    return toAppointmentResponse(await findAccessibleOrThrow(id, user))
  },

  async cancel(id: string, reason: string | undefined, user: PublicUser) {
    const appointment = await findAccessibleOrThrow(id, user)

    if (!isActive(appointment.status)) {
      throw new ConflictError('Only scheduled or confirmed appointments can be cancelled')
    }

    const now = new Date()
    if (appointment.startsAt <= now) {
      throw new BadRequestError('Past appointments cannot be cancelled')
    }

    const hoursBefore = (appointment.startsAt.getTime() - now.getTime()) / 3_600_000
    if (user.role === 'patient' && hoursBefore < MIN_CANCEL_NOTICE_HOURS) {
      throw new BadRequestError(
        `Appointments can only be cancelled at least ${MIN_CANCEL_NOTICE_HOURS} hours in advance`,
      )
    }

    const cancelled = await appointmentsRepository.cancel(id, reason ?? null)
    return toAppointmentResponse(cancelled)
  },
}
