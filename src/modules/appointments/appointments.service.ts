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
import {
  ACTIVE_STATUSES,
  MIN_PATIENT_NOTICE_HOURS,
  STATUS_TRANSITIONS,
} from './appointments.constants.js'
import { isDoubleBookingError } from './appointments.errors.js'
import { appointmentsRepository, type AppointmentWithRelations } from './appointments.repository.js'
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentStatusInput,
} from './appointments.schema.js'
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

// The requested start must be one of the free slots computed for that day
const findSlotOrThrow = async (
  { doctorId, serviceId, startsAt }: { doctorId: string; serviceId: string; startsAt: Date },
  excludeAppointmentId?: string,
) => {
  const { slots } = await availabilityService.getSlots(
    { doctorId, serviceId, date: getLocalDate(startsAt, env.CLINIC_TIMEZONE) },
    excludeAppointmentId ? { excludeAppointmentId } : {},
  )
  const slot = slots.find((candidate) => candidate.startsAt === startsAt.toISOString())
  if (!slot) throw new ConflictError('The requested time is not available')
  return { startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) }
}

// Active appointment that has not started yet; patients also need enough notice
const assertCanChange = (appointment: AppointmentWithRelations, user: PublicUser) => {
  if (!isActive(appointment.status)) {
    throw new ConflictError('Only scheduled or confirmed appointments can be changed')
  }

  const now = new Date()
  if (appointment.startsAt <= now) {
    throw new BadRequestError('Past appointments cannot be changed')
  }

  const hoursBefore = (appointment.startsAt.getTime() - now.getTime()) / 3_600_000
  if (user.role === 'patient' && hoursBefore < MIN_PATIENT_NOTICE_HOURS) {
    throw new BadRequestError(
      `Patients can cancel or reschedule at least ${MIN_PATIENT_NOTICE_HOURS} hours in advance`,
    )
  }
}

// Runs a write and turns the database's double booking error into a 409
const withDoubleBookingCheck = async <T>(write: () => Promise<T>) => {
  try {
    return await write()
  } catch (error) {
    if (isDoubleBookingError(error)) {
      throw new ConflictError('This time slot was just booked, please choose another one')
    }
    throw error
  }
}

export const appointmentsService = {
  async book(input: CreateAppointmentInput, user: PublicUser) {
    const patientId = await resolvePatientId(input, user)
    const { startsAt, endsAt } = await findSlotOrThrow(input)

    if (await appointmentsRepository.findActiveForPatientBetween(patientId, startsAt, endsAt)) {
      throw new ConflictError('The patient already has an appointment at that time')
    }

    const appointment = await withDoubleBookingCheck(() =>
      appointmentsRepository.create({
        patientId,
        doctorId: input.doctorId,
        serviceId: input.serviceId,
        startsAt,
        endsAt,
        notes: input.notes ?? null,
        createdById: user.id,
      }),
    )
    return toAppointmentResponse(appointment)
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
    assertCanChange(appointment, user)

    const cancelled = await appointmentsRepository.cancel(id, reason ?? null)
    return toAppointmentResponse(cancelled)
  },

  async reschedule(id: string, newStartsAt: Date, user: PublicUser) {
    const appointment = await findAccessibleOrThrow(id, user)
    assertCanChange(appointment, user)

    if (appointment.startsAt.getTime() === newStartsAt.getTime()) {
      throw new BadRequestError('The new time is the same as the current one')
    }

    // Same doctor and service; the appointment's current time does not count as busy
    const { startsAt, endsAt } = await findSlotOrThrow(
      {
        doctorId: appointment.doctorId,
        serviceId: appointment.serviceId,
        startsAt: newStartsAt,
      },
      appointment.id,
    )

    const patientConflict = await appointmentsRepository.findActiveForPatientBetween(
      appointment.patientId,
      startsAt,
      endsAt,
      appointment.id,
    )
    if (patientConflict) {
      throw new ConflictError('The patient already has an appointment at that time')
    }

    const rescheduled = await withDoubleBookingCheck(() =>
      appointmentsRepository.reschedule(id, startsAt, endsAt),
    )
    return toAppointmentResponse(rescheduled)
  },

  async updateStatus(id: string, { status }: UpdateAppointmentStatusInput, user: PublicUser) {
    const appointment = await findAccessibleOrThrow(id, user)

    // 1. Is the change allowed by the state machine?
    if (!STATUS_TRANSITIONS[appointment.status].includes(status)) {
      throw new ConflictError(`Cannot change status from ${appointment.status} to ${status}`)
    }

    // 2. Who can make it? Patients confirm their attendance; doctors record the outcome
    const isOwnPatient = appointment.patient.userId === user.id
    const isOwnDoctor = appointment.doctor.userId === user.id
    const allowed =
      status === 'confirmed' ? isStaff(user) || isOwnPatient : isStaff(user) || isOwnDoctor
    if (!allowed) throw new ForbiddenError()

    // 3. When? Confirm before the appointment; record the outcome once it has started
    const hasStarted = appointment.startsAt <= new Date()
    if (status === 'confirmed' && hasStarted) {
      throw new BadRequestError('Only upcoming appointments can be confirmed')
    }
    if (status !== 'confirmed' && !hasStarted) {
      throw new BadRequestError(`An appointment can be marked as ${status} once it has started`)
    }

    const updated = await appointmentsRepository.updateStatus(id, status)
    return toAppointmentResponse(updated)
  },
}
