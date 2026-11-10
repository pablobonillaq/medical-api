import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env.js'
import { prisma } from '../../db/prisma.js'
import type { AppointmentStatus } from '../../generated/prisma/enums.js'
import {
  createDoctorWithService,
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
  tomorrow,
  type TestAgent,
} from '../../test/helpers.js'
import { localDateTimeToUtc } from '../../shared/utils/timezone.js'
import { appointmentsRepository } from './appointments.repository.js'

const HOUR = 60 * 60 * 1000
const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

// Tomorrow at a local clinic time, e.g. at(8) → tomorrow 08:00 in America/Mexico_City
const at = (hour: number) => localDateTimeToUtc(tomorrow(), hour * 60, env.CLINIC_TIMEZONE)

type Doctor = Awaited<ReturnType<typeof createDoctorWithService>>
type Patient = Awaited<ReturnType<typeof createPatient>>

interface AppointmentBody {
  patientId: string
  doctorId: string
}

describe('appointment rules (integration)', () => {
  let first: Doctor
  let second: Doctor
  let patientA: Patient
  let patientB: Patient
  let asPatientA: TestAgent
  let asDoctor: TestAgent
  let asEmployee: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    first = await createDoctorWithService()
    second = await createDoctorWithService()
    patientA = await createPatient()
    patientB = await createPatient()
    asPatientA = await loginAs(patientA.user?.email ?? '')
    asDoctor = await loginAs(first.doctor.user.email)
    asEmployee = await loginAs((await createUser('employee')).email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // Written directly in the database: no availability rules, any time and status
  const insertAppointment = ({
    doctor = first,
    patient = patientA,
    startsAt,
    status = 'scheduled',
  }: {
    doctor?: Doctor
    patient?: Patient
    startsAt: Date
    status?: AppointmentStatus
  }) =>
    prisma.appointment.create({
      data: {
        doctorId: doctor.doctor.id,
        serviceId: doctor.service.id,
        patientId: patient.id,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 30 * 60 * 1000),
        status,
      },
    })

  const bookingFor = (doctor: Doctor, startsAt: Date) => ({
    doctorId: doctor.doctor.id,
    serviceId: doctor.service.id,
    startsAt: startsAt.toISOString(),
  })

  describe('booking', () => {
    it('front desk books for a patient', async () => {
      const response = await asEmployee
        .post('/appointments')
        .send({ ...bookingFor(first, at(8)), patientId: patientA.id })
        .expect(201)

      expect(response.body.appointment).toMatchObject({ patientId: patientA.id, time: '08:00' })
    })

    it('front desk must say which patient, and the patient must exist', async () => {
      const missing = await asEmployee.post('/appointments').send(bookingFor(first, at(8)))
      expect(missing.status).toBe(400)
      expect(missing.body.error).toBe('patientId is required')

      await asEmployee
        .post('/appointments')
        .send({ ...bookingFor(first, at(8)), patientId: NOT_FOUND_ID })
        .expect(404)
    })

    it('a patient can send their own patientId, but not another one (403)', async () => {
      await asPatientA
        .post('/appointments')
        .send({ ...bookingFor(first, at(8)), patientId: patientB.id })
        .expect(403)

      await asPatientA
        .post('/appointments')
        .send({ ...bookingFor(first, at(8)), patientId: patientA.id })
        .expect(201)
    })

    it('a patient account without a profile gets 404', async () => {
      const agent = await loginAs((await createUser('patient')).email)

      const response = await agent
        .post('/appointments')
        .send(bookingFor(first, at(8)))
        .expect(404)
      expect(response.body.error).toBe('Patient profile not found')
    })

    it('rejects a booking when the patient already has an appointment at that time (409)', async () => {
      await asPatientA
        .post('/appointments')
        .send(bookingFor(first, at(8)))
        .expect(201)

      const response = await asPatientA
        .post('/appointments')
        .send(bookingFor(second, at(8)))
        .expect(409)
      expect(response.body.error).toBe('The patient already has an appointment at that time')
    })

    it('an unexpected database error is not reported as a conflict (500)', async () => {
      vi.spyOn(appointmentsRepository, 'create').mockRejectedValue(new Error('Connection lost'))
      vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await asPatientA
        .post('/appointments')
        .send(bookingFor(first, at(8)))
        .expect(500)
    })

    it('turns a booking that loses the race for a slot into a 409', async () => {
      // Another booking is saved right after this request checked the availability
      await insertAppointment({ startsAt: at(8), patient: patientB })
      vi.spyOn(appointmentsRepository, 'findActiveForDoctorBetween').mockResolvedValue([])

      const response = await asPatientA
        .post('/appointments')
        .send(bookingFor(first, at(8)))
        .expect(409)

      expect(response.body.error).toBe('This time slot was just booked, please choose another one')
    })
  })

  describe('listing', () => {
    beforeEach(async () => {
      await insertAppointment({ startsAt: at(8) })
      await insertAppointment({
        startsAt: at(9),
        doctor: second,
        patient: patientB,
        status: 'confirmed',
      })
      await insertAppointment({ startsAt: new Date(Date.now() - 24 * HOUR), status: 'completed' })
    })

    const list = (agent: TestAgent, query: Record<string, string | number> = {}) =>
      agent.get('/appointments').query(query).expect(200)

    it('front desk sees every appointment, paginated', async () => {
      const response = await list(asEmployee, { pageSize: 1 })

      expect(response.body).toMatchObject({ page: 1, pageSize: 1, total: 3 })
      expect(response.body.appointments).toHaveLength(1)
    })

    it('front desk filters by status, doctor, patient and dates', async () => {
      const now = new Date().toISOString()

      const all = await list(asEmployee, {
        status: 'scheduled',
        doctorId: first.doctor.id,
        patientId: patientA.id,
        from: now,
        to: new Date(Date.now() + 72 * HOUR).toISOString(),
      })
      expect(all.body.total).toBe(1)

      expect((await list(asEmployee, { from: now })).body.total).toBe(2)
      expect((await list(asEmployee, { to: now })).body.total).toBe(1)
    })

    it('patients only see their own appointments, whatever filters they send', async () => {
      const response = await list(asPatientA, { patientId: patientB.id })

      const appointments = response.body.appointments as AppointmentBody[]
      expect(appointments).toHaveLength(2)
      expect(appointments.every((a) => a.patientId === patientA.id)).toBe(true)
    })

    it('doctors only see their own appointments', async () => {
      const response = await list(asDoctor, { doctorId: second.doctor.id })

      const appointments = response.body.appointments as AppointmentBody[]
      expect(appointments).toHaveLength(2)
      expect(appointments.every((a) => a.doctorId === first.doctor.id)).toBe(true)
    })

    it('accounts without a profile get 404', async () => {
      const patient = await loginAs((await createUser('patient')).email)
      const doctor = await loginAs((await createUser('doctor')).email)

      await patient.get('/appointments').expect(404)
      await doctor.get('/appointments').expect(404)
    })
  })

  describe('cancelling and rescheduling', () => {
    it('staff can read any appointment', async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })

      const response = await asEmployee.get(`/appointments/${appointment.id}`).expect(200)
      expect(response.body.appointment.id).toBe(appointment.id)
    })

    it('cancels without a reason', async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })

      const response = await asPatientA.patch(`/appointments/${appointment.id}/cancel`).expect(200)
      expect(response.body.appointment).toMatchObject({
        status: 'cancelled',
        cancellationReason: null,
      })
    })

    it('a cancelled appointment cannot change (409), nor one in the past (400)', async () => {
      const cancelled = await insertAppointment({ startsAt: at(8), status: 'cancelled' })
      const past = await insertAppointment({ startsAt: new Date(Date.now() - 24 * HOUR) })

      await asEmployee.patch(`/appointments/${cancelled.id}/cancel`).expect(409)
      const response = await asEmployee.patch(`/appointments/${past.id}/cancel`).expect(400)
      expect(response.body.error).toBe('Past appointments cannot be changed')
    })

    it('patients need 2 hours of notice; front desk does not', async () => {
      const soon = await insertAppointment({ startsAt: new Date(Date.now() + HOUR) })

      await asPatientA.patch(`/appointments/${soon.id}/cancel`).expect(400)
      await asEmployee.patch(`/appointments/${soon.id}/cancel`).expect(200)
    })

    it('rejects rescheduling to the same time (400)', async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })

      const response = await asPatientA
        .patch(`/appointments/${appointment.id}/reschedule`)
        .send({ startsAt: at(8).toISOString() })
        .expect(400)
      expect(response.body.error).toBe('The new time is the same as the current one')
    })

    it("rejects rescheduling onto another of the patient's appointments (409)", async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })
      await insertAppointment({ startsAt: at(9), doctor: second })

      const response = await asPatientA
        .patch(`/appointments/${appointment.id}/reschedule`)
        .send({ startsAt: at(9).toISOString() })
        .expect(409)
      expect(response.body.error).toBe('The patient already has an appointment at that time')
    })
  })

  describe('status changes', () => {
    const setStatus = (agent: TestAgent, id: string, status: string) =>
      agent.patch(`/appointments/${id}/status`).send({ status })

    it('the patient confirms an upcoming appointment', async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })

      const response = await setStatus(asPatientA, appointment.id, 'confirmed').expect(200)
      expect(response.body.appointment.status).toBe('confirmed')
    })

    it('an appointment that already started cannot be confirmed (400)', async () => {
      const past = await insertAppointment({ startsAt: new Date(Date.now() - HOUR) })

      const response = await setStatus(asEmployee, past.id, 'confirmed').expect(400)
      expect(response.body.error).toBe('Only upcoming appointments can be confirmed')
    })

    it('the doctor records completed or no_show once it started', async () => {
      const attended = await insertAppointment({ startsAt: new Date(Date.now() - 2 * HOUR) })
      const missed = await insertAppointment({ startsAt: new Date(Date.now() - 24 * HOUR) })

      await setStatus(asDoctor, attended.id, 'completed').expect(200)
      await setStatus(asDoctor, missed.id, 'no_show').expect(200)

      const statuses = await prisma.appointment.findMany({
        where: { id: { in: [attended.id, missed.id] } },
        select: { id: true, status: true },
      })
      expect(new Map(statuses.map((a) => [a.id, a.status]))).toEqual(
        new Map([
          [attended.id, 'completed'],
          [missed.id, 'no_show'],
        ]),
      )
    })

    it('rejects a status that is not allowed here (400)', async () => {
      const appointment = await insertAppointment({ startsAt: at(8) })

      await setStatus(asEmployee, appointment.id, 'cancelled').expect(400)
    })
  })
})
