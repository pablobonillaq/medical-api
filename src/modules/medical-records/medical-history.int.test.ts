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

describe('medical history (integration)', () => {
  let patient: Awaited<ReturnType<typeof createPatient>>
  let doctorEmail: string
  let url: string

  const history = {
    bloodType: 'O+',
    allergies: 'Penicilina',
    chronicConditions: 'Hipertensión arterial',
  }

  beforeEach(async () => {
    await resetDatabase()
    const { doctor, service } = await createDoctorWithService()
    patient = await createPatient()
    // The appointment makes this doctor one of the patient's treating doctors
    await createAppointment({ doctorId: doctor.id, serviceId: service.id, patientId: patient.id })
    doctorEmail = doctor.user.email
    url = `/patients/${patient.id}/medical-history`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('lets the treating doctor create the history and audits it without clinical content', async () => {
    const agent = await loginAs(doctorEmail)

    const response = await agent.put(url).send(history).expect(200)

    expect(response.body.medicalHistory).toMatchObject({
      ...history,
      currentMedications: null,
      updatedBy: { name: 'Ana Garay' },
    })
    const entries = await prisma.auditLog.findMany({ where: { patientId: patient.id } })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      action: 'create',
      resource: 'medical_history',
      actorRole: 'doctor',
      details: { changedFields: ['bloodType', 'allergies', 'chronicConditions'] },
    })
    expect(JSON.stringify(entries)).not.toContain('Penicilina')
  })

  it('replaces the whole history on PUT and audits only the names of the changed fields', async () => {
    const agent = await loginAs(doctorEmail)
    await agent.put(url).send(history).expect(200)

    const response = await agent
      .put(url)
      .send({ ...history, allergies: '' })
      .expect(200)

    expect(response.body.medicalHistory.allergies).toBeNull()
    const updates = await prisma.auditLog.findMany({
      where: { patientId: patient.id, action: 'update' },
    })
    expect(updates).toHaveLength(1)
    expect(updates[0]?.details).toEqual({ changedFields: ['allergies'] })
  })

  it('returns null while the patient has no history yet', async () => {
    const agent = await loginAs(doctorEmail)

    const response = await agent.get(url).expect(200)

    expect(response.body.medicalHistory).toBeNull()
  })

  it('lets patients read their own history but not change it', async () => {
    const doctor = await loginAs(doctorEmail)
    await doctor.put(url).send(history).expect(200)
    const agent = await loginAs(patient.user?.email ?? '')

    const response = await agent.get(url).expect(200)
    await agent.put(url).send(history).expect(403)

    expect(response.body.medicalHistory).toMatchObject(history)
    const entries = await prisma.auditLog.findMany({
      where: { patientId: patient.id, actorRole: 'patient' },
    })
    expect(entries.map((entry) => entry.action).sort()).toEqual(['denied', 'read'])
  })

  it('hides the record from doctors who do not treat the patient and audits the attempt', async () => {
    const { doctor: otherDoctor } = await createDoctorWithService()
    const agent = await loginAs(otherDoctor.user.email)

    await agent.get(url).expect(404)

    const denied = await prisma.auditLog.count({
      where: { actorId: otherDoctor.userId, action: 'denied' },
    })
    expect(denied).toBe(1)
  })

  it.each(['admin', 'employee'] as const)('denies access to %s users', async (role) => {
    const user = await createUser(role)
    const agent = await loginAs(user.email)

    await agent.get(url).expect(404)

    const denied = await prisma.auditLog.count({ where: { actorId: user.id, action: 'denied' } })
    expect(denied).toBe(1)
  })

  it('rejects an invalid blood type (400)', async () => {
    const agent = await loginAs(doctorEmail)

    await agent
      .put(url)
      .send({ ...history, bloodType: 'C+' })
      .expect(400)
  })

  it('never lets the audit log be changed or deleted', async () => {
    const agent = await loginAs(doctorEmail)
    await agent.get(url).expect(200)

    await expect(prisma.auditLog.deleteMany()).rejects.toThrow()
    await expect(prisma.auditLog.updateMany({ data: { ip: '0.0.0.0' } })).rejects.toThrow()
    expect(await prisma.auditLog.count()).toBe(1)
  })
})
