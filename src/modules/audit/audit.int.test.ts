import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createAppointment,
  createDoctorWithService,
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
} from '../../test/helpers.js'

describe('audit log (integration)', () => {
  let patient: Awaited<ReturnType<typeof createPatient>>
  let doctorUserId: string
  let doctorEmail: string

  // The doctor writes the history, then reads it; the patient reads it once
  beforeEach(async () => {
    await resetDatabase()
    const { doctor, service } = await createDoctorWithService()
    patient = await createPatient()
    await createAppointment({ doctorId: doctor.id, serviceId: service.id, patientId: patient.id })
    doctorUserId = doctor.userId
    doctorEmail = doctor.user.email

    const url = `/patients/${patient.id}/medical-history`
    const doctorAgent = await loginAs(doctorEmail)
    await doctorAgent.put(url).send({ allergies: 'Penicilina' }).expect(200)
    await doctorAgent.get(url).expect(200)
    const patientAgent = await loginAs(patient.user?.email ?? '')
    await patientAgent.get(url).expect(200)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  describe('GET /audit-logs', () => {
    it('lets admins filter the log, newest first, without clinical content', async () => {
      const admin = await createUser('admin')
      const agent = await loginAs(admin.email)

      const response = await agent.get('/audit-logs').query({ actorId: doctorUserId }).expect(200)

      const entries = response.body.entries as { action: string }[]
      expect(response.body.total).toBe(2)
      expect(entries.map((entry) => entry.action)).toEqual(['read', 'create'])
      expect(response.body.entries[0]).toMatchObject({
        resource: 'medical_history',
        patientId: patient.id,
        actor: { id: doctorUserId, role: 'doctor', name: 'Ana Garay' },
      })
      expect(JSON.stringify(response.body)).not.toContain('Penicilina')
    })

    it('filters by action', async () => {
      const admin = await createUser('admin')
      const agent = await loginAs(admin.email)

      const response = await agent.get('/audit-logs').query({ action: 'create' }).expect(200)

      expect(response.body.total).toBe(1)
    })

    it('rejects invalid filters (400)', async () => {
      const admin = await createUser('admin')
      const agent = await loginAs(admin.email)

      await agent.get('/audit-logs').query({ action: 'delete' }).expect(400)
    })

    it.each(['doctor', 'employee', 'patient'] as const)(
      'is forbidden for %s users',
      async (role) => {
        const user = await createUser(role)
        const agent = await loginAs(user.email)

        await agent.get('/audit-logs').expect(403)
      },
    )
  })

  describe('GET /patients/me/access-log', () => {
    it("shows patients who opened their record, without their own visits or staff's details", async () => {
      const agent = await loginAs(patient.user?.email ?? '')

      const response = await agent.get('/patients/me/access-log').expect(200)

      expect(response.body.total).toBe(2)
      expect(response.body.entries[0]).toEqual({
        id: expect.any(String),
        action: 'read',
        resource: 'medical_history',
        resourceId: expect.any(String),
        createdAt: expect.any(String),
        actor: { role: 'doctor', name: 'Ana Garay' },
      })
    })

    it('is only for patients (403)', async () => {
      const agent = await loginAs(doctorEmail)

      await agent.get('/patients/me/access-log').expect(403)
    })
  })
})
