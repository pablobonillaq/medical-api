import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppointmentStatus } from '../../generated/prisma/enums.js'
import type { PublicUser } from '../users/users.types.js'
import { appointmentsRepository, type AppointmentWithRelations } from './appointments.repository.js'
import { appointmentsService } from './appointments.service.js'

// "Now" is frozen at Monday 2026-11-09 12:00 UTC so the tests never depend on the real clock
const NOW = new Date('2026-11-09T12:00:00.000Z')
const HOUR = 60 * 60 * 1000

const buildUser = (role: PublicUser['role'], id: string): PublicUser => ({
  id,
  email: `${id}@test.com`,
  role,
  active: true,
  createdAt: NOW,
  updatedAt: NOW,
})

const patientUser = buildUser('patient', 'patient-user')
const doctorUser = buildUser('doctor', 'doctor-user')
const otherDoctorUser = buildUser('doctor', 'other-doctor-user')
const employeeUser = buildUser('employee', 'employee-user')

// An appointment that starts `hoursFromNow` hours after NOW (negative = already started)
const buildAppointment = (
  status: AppointmentStatus,
  hoursFromNow: number,
): AppointmentWithRelations => {
  const startsAt = new Date(NOW.getTime() + hoursFromNow * HOUR)
  return {
    id: 'appointment-1',
    patientId: 'patient-1',
    doctorId: 'doctor-1',
    serviceId: 'service-1',
    startsAt,
    endsAt: new Date(startsAt.getTime() + HOUR / 2),
    status,
    notes: null,
    createdById: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    patient: {
      id: 'patient-1',
      firstName: 'Luz',
      lastName: 'Méndez',
      phone: '+525512345678',
      userId: patientUser.id,
    },
    doctor: {
      id: 'doctor-1',
      firstName: 'Ana',
      lastName: 'Garay',
      specialty: 'Medicina general',
      userId: doctorUser.id,
    },
    service: { id: 'service-1', name: 'Consulta general', durationMinutes: 30 },
  }
}

// Replaces the repository's database calls with fake ones for a single test
const mockRepository = (appointment: AppointmentWithRelations, newStatus = appointment.status) => {
  vi.spyOn(appointmentsRepository, 'findById').mockResolvedValue(appointment)
  return vi
    .spyOn(appointmentsRepository, 'updateStatus')
    .mockResolvedValue({ ...appointment, status: newStatus })
}

describe('appointmentsService.updateStatus (state machine)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lets the patient confirm an upcoming appointment', async () => {
    const updateStatus = mockRepository(buildAppointment('scheduled', 48), 'confirmed')

    const result = await appointmentsService.updateStatus(
      'appointment-1',
      { status: 'confirmed' },
      patientUser,
    )

    expect(result.status).toBe('confirmed')
    expect(updateStatus).toHaveBeenCalledWith('appointment-1', 'confirmed')
  })

  it('lets the doctor mark an appointment as completed once it has started', async () => {
    mockRepository(buildAppointment('confirmed', -1), 'completed')

    const result = await appointmentsService.updateStatus(
      'appointment-1',
      { status: 'completed' },
      doctorUser,
    )
    expect(result.status).toBe('completed')
  })

  it('rejects a change that the state machine does not allow (409)', async () => {
    const updateStatus = mockRepository(buildAppointment('completed', -1))

    await expect(
      appointmentsService.updateStatus('appointment-1', { status: 'confirmed' }, employeeUser),
    ).rejects.toMatchObject({ statusCode: 409 })
    expect(updateStatus).not.toHaveBeenCalled()
  })

  it('does not let a patient record the outcome (403)', async () => {
    mockRepository(buildAppointment('scheduled', -1))

    await expect(
      appointmentsService.updateStatus('appointment-1', { status: 'no_show' }, patientUser),
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  it('does not mark an appointment as completed before it starts (400)', async () => {
    mockRepository(buildAppointment('scheduled', 2))

    await expect(
      appointmentsService.updateStatus('appointment-1', { status: 'completed' }, doctorUser),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it("hides another doctor's appointment (404)", async () => {
    mockRepository(buildAppointment('scheduled', -1))

    await expect(
      appointmentsService.updateStatus('appointment-1', { status: 'completed' }, otherDoctorUser),
    ).rejects.toMatchObject({ statusCode: 404 })
  })
})
