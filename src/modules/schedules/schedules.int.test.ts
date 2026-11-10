import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createDoctorWithService,
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
  type TestAgent,
} from '../../test/helpers.js'

const HOUR = 60 * 60 * 1000

// An ISO date `hours` hours from now (negative = in the past)
const hoursFromNow = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString()

const NOT_FOUND_ID = '00000000-0000-4000-8000-000000000000'

describe('schedules and time off (integration)', () => {
  let doctorId: string
  let doctor: TestAgent
  let otherDoctor: TestAgent
  let admin: TestAgent
  let employee: TestAgent
  let patient: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    const created = await createDoctorWithService()
    doctorId = created.doctor.id
    doctor = await loginAs(created.doctor.user.email)
    otherDoctor = await loginAs((await createDoctorWithService()).doctor.user.email)
    admin = await loginAs((await createUser('admin')).email)
    employee = await loginAs((await createUser('employee')).email)
    patient = await loginAs((await createPatient()).user?.email ?? '')
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('weekly schedule', () => {
    const schedule = {
      // Sent out of order on purpose: the response comes sorted by day and start time
      blocks: [
        { dayOfWeek: 3, start: '09:00', end: '13:00' },
        { dayOfWeek: 1, start: '15:00', end: '19:00' },
        { dayOfWeek: 1, start: '09:00', end: '13:00' },
      ],
    }

    it('lets any signed-in user read a schedule, as HH:mm times', async () => {
      const response = await patient.get(`/doctors/${doctorId}/schedule`).expect(200)

      // The test doctor works every day from 08:00 to 18:00
      expect(response.body.blocks).toHaveLength(7)
      expect(response.body.blocks[0]).toMatchObject({ dayOfWeek: 1, start: '08:00', end: '18:00' })
    })

    it('the doctor replaces their own schedule', async () => {
      const response = await doctor.put(`/doctors/${doctorId}/schedule`).send(schedule).expect(200)

      expect(response.body.blocks).toMatchObject([
        { dayOfWeek: 1, start: '09:00', end: '13:00' },
        { dayOfWeek: 1, start: '15:00', end: '19:00' },
        { dayOfWeek: 3, start: '09:00', end: '13:00' },
      ])
      expect(await prisma.scheduleBlock.count({ where: { doctorId } })).toBe(3)
    })

    it('the admin can replace any schedule, even with an empty one', async () => {
      const response = await admin
        .put(`/doctors/${doctorId}/schedule`)
        .send({ blocks: [] })
        .expect(200)

      expect(response.body.blocks).toEqual([])
    })

    it('other doctors and front desk cannot change it (403)', async () => {
      await otherDoctor.put(`/doctors/${doctorId}/schedule`).send(schedule).expect(403)
      await employee.put(`/doctors/${doctorId}/schedule`).send(schedule).expect(403)
    })

    it('returns 404 for a doctor that does not exist', async () => {
      await admin.get(`/doctors/${NOT_FOUND_ID}/schedule`).expect(404)
      await admin.put(`/doctors/${NOT_FOUND_ID}/schedule`).send(schedule).expect(404)
    })

    it('rejects times that are not multiples of 5 minutes (400)', async () => {
      const response = await doctor
        .put(`/doctors/${doctorId}/schedule`)
        .send({ blocks: [{ dayOfWeek: 2, start: '09:03', end: '13:00' }] })
        .expect(400)

      expect(response.body.details.fieldErrors.blocks).toContain(
        'Times must be multiples of 5 minutes',
      )
    })

    it('rejects a block that ends before it starts (400)', async () => {
      const response = await doctor
        .put(`/doctors/${doctorId}/schedule`)
        .send({ blocks: [{ dayOfWeek: 2, start: '13:00', end: '09:00' }] })
        .expect(400)

      expect(response.body.details.fieldErrors.blocks).toContain('end must be after start')
    })

    it('rejects overlapping blocks on the same day (400)', async () => {
      const response = await doctor
        .put(`/doctors/${doctorId}/schedule`)
        .send({
          blocks: [
            { dayOfWeek: 2, start: '09:00', end: '13:00' },
            { dayOfWeek: 2, start: '12:00', end: '16:00' },
          ],
        })
        .expect(400)

      expect(response.body.details.fieldErrors.blocks).toContain(
        'Blocks overlap on day 2: 09:00–13:00 and 12:00–16:00',
      )
      // Nothing changed
      expect(await prisma.scheduleBlock.count({ where: { doctorId } })).toBe(7)
    })
  })

  describe('time off', () => {
    const vacation = () => ({
      startsAt: hoursFromNow(48),
      endsAt: hoursFromNow(72),
      reason: 'Congreso médico',
    })

    it('the doctor adds time off, and front desk can see it', async () => {
      const created = await doctor
        .post(`/doctors/${doctorId}/time-off`)
        .send(vacation())
        .expect(201)
      expect(created.body.timeOff).toMatchObject({ doctorId, reason: 'Congreso médico' })

      const response = await employee.get(`/doctors/${doctorId}/time-off`).expect(200)
      expect(response.body.timeOff).toHaveLength(1)
      expect(response.body.timeOff[0].id).toBe(created.body.timeOff.id)
    })

    it('the admin adds time off without a reason', async () => {
      const response = await admin
        .post(`/doctors/${doctorId}/time-off`)
        .send({ startsAt: hoursFromNow(2), endsAt: hoursFromNow(4) })
        .expect(201)

      expect(response.body.timeOff.reason).toBeNull()
    })

    it('only lists time off that has not ended yet', async () => {
      await prisma.timeOff.create({
        data: {
          doctorId,
          startsAt: new Date(hoursFromNow(-48)),
          endsAt: new Date(hoursFromNow(-24)),
        },
      })
      await doctor.post(`/doctors/${doctorId}/time-off`).send(vacation()).expect(201)

      const response = await doctor.get(`/doctors/${doctorId}/time-off`).expect(200)
      expect(response.body.timeOff).toHaveLength(1)
    })

    it('rejects time off that overlaps another one (409)', async () => {
      await doctor.post(`/doctors/${doctorId}/time-off`).send(vacation()).expect(201)

      await doctor
        .post(`/doctors/${doctorId}/time-off`)
        .send({ startsAt: hoursFromNow(60), endsAt: hoursFromNow(96) })
        .expect(409)
    })

    it('rejects an end before the start, or an end in the past (400)', async () => {
      const backwards = await doctor
        .post(`/doctors/${doctorId}/time-off`)
        .send({ startsAt: hoursFromNow(72), endsAt: hoursFromNow(48) })
        .expect(400)
      expect(backwards.body.details.fieldErrors.endsAt).toContain('endsAt must be after startsAt')

      const past = await doctor
        .post(`/doctors/${doctorId}/time-off`)
        .send({ startsAt: hoursFromNow(-72), endsAt: hoursFromNow(-48) })
        .expect(400)
      expect(past.body.details.fieldErrors.endsAt).toContain('Time off must end in the future')
    })

    it('patients and other doctors cannot see or change it (403)', async () => {
      await patient.get(`/doctors/${doctorId}/time-off`).expect(403)
      await otherDoctor.get(`/doctors/${doctorId}/time-off`).expect(403)
      await otherDoctor.post(`/doctors/${doctorId}/time-off`).send(vacation()).expect(403)
      await employee.post(`/doctors/${doctorId}/time-off`).send(vacation()).expect(403)
    })

    it('deletes time off; deleting it again returns 404', async () => {
      const created = await doctor
        .post(`/doctors/${doctorId}/time-off`)
        .send(vacation())
        .expect(201)
      const url = `/doctors/${doctorId}/time-off/${created.body.timeOff.id}`

      await otherDoctor.delete(url).expect(403)
      await doctor.delete(url).expect(204)
      await doctor.delete(url).expect(404)
      expect(await prisma.timeOff.count()).toBe(0)
    })

    it('returns 404 for a doctor that does not exist', async () => {
      await admin.get(`/doctors/${NOT_FOUND_ID}/time-off`).expect(404)
    })
  })
})
