import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createDoctorWithService,
  createUser,
  loginAs,
  resetDatabase,
  TEST_PASSWORD,
  type TestAgent,
} from '../../test/helpers.js'

const newDoctor = {
  email: 'dr.ruiz@clinica.test',
  password: TEST_PASSWORD,
  firstName: 'Luis',
  lastName: 'Ruiz',
  specialty: 'Pediatría',
  licenseNumber: '7654321',
}

describe('doctors (integration)', () => {
  let admin: TestAgent
  let employee: TestAgent

  beforeEach(async () => {
    await resetDatabase()
    admin = await loginAs((await createUser('admin')).email)
    employee = await loginAs((await createUser('employee')).email)
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const createDoctor = async () => {
    const response = await admin.post('/doctors').send(newDoctor).expect(201)
    return response.body.doctor as { id: string; userId: string }
  }

  it('creates the account and the profile in one request', async () => {
    const response = await admin.post('/doctors').send(newDoctor).expect(201)

    expect(response.body.doctor).toMatchObject({
      firstName: 'Luis',
      email: 'dr.ruiz@clinica.test',
      licenseNumber: '7654321',
      active: true,
      services: [],
    })
    // The new doctor can log in right away
    await loginAs(newDoctor.email)
  })

  it('rejects a duplicated email or license number (409)', async () => {
    await createDoctor()

    await admin
      .post('/doctors')
      .send({ ...newDoctor, licenseNumber: '1111111' })
      .expect(409)
    await admin
      .post('/doctors')
      .send({ ...newDoctor, email: 'otro@clinica.test' })
      .expect(409)
  })

  it('assigns services (ignoring repeated ids) and filters doctors by service', async () => {
    const doctor = await createDoctor()
    const { service } = await createDoctorWithService()

    const response = await admin
      .put(`/doctors/${doctor.id}/services`)
      .send({ serviceIds: [service.id, service.id] })
      .expect(200)
    const byService = await employee.get('/doctors').query({ serviceId: service.id }).expect(200)

    expect(response.body.doctor.services).toEqual([
      expect.objectContaining({ id: service.id, active: true }),
    ])
    expect(byService.body.doctors).toHaveLength(2)
  })

  it('rejects services that do not exist or are inactive (400)', async () => {
    const doctor = await createDoctor()
    const { service } = await createDoctorWithService()
    await prisma.service.update({ where: { id: service.id }, data: { active: false } })

    await admin
      .put(`/doctors/${doctor.id}/services`)
      .send({ serviceIds: [service.id] })
      .expect(400)
    await admin
      .put('/doctors/0190a7b2-0000-7000-8000-000000000000/services')
      .send({ serviceIds: [] })
      .expect(404)
  })

  it('updates the profile, and answers 404 for a doctor that does not exist', async () => {
    const doctor = await createDoctor()

    const response = await admin
      .patch(`/doctors/${doctor.id}`)
      .send({ specialty: 'Pediatría general' })
      .expect(200)
    await admin
      .patch('/doctors/0190a7b2-0000-7000-8000-000000000000')
      .send({ specialty: 'Otra' })
      .expect(404)

    expect(response.body.doctor).toMatchObject({ specialty: 'Pediatría general', lastName: 'Ruiz' })
  })

  it('hides disabled doctors, except for the admin', async () => {
    const doctor = await createDoctor()
    await prisma.user.update({ where: { id: doctor.userId }, data: { active: false } })

    const forStaff = await employee.get('/doctors').expect(200)
    const forAdmin = await admin.get('/doctors').query({ includeInactive: true }).expect(200)
    await employee.get(`/doctors/${doctor.id}`).expect(404)
    const oneForAdmin = await admin.get(`/doctors/${doctor.id}`).expect(200)

    expect(forStaff.body.doctors).toHaveLength(0)
    expect(forAdmin.body.doctors).toHaveLength(1)
    expect(oneForAdmin.body.doctor.active).toBe(false)
  })

  it('only lets the admin manage doctors (403)', async () => {
    const doctor = await createDoctor()

    await employee.post('/doctors').send(newDoctor).expect(403)
    await employee.patch(`/doctors/${doctor.id}`).send({ specialty: 'Otra' }).expect(403)
    await employee.put(`/doctors/${doctor.id}/services`).send({ serviceIds: [] }).expect(403)
  })

  it('validates the license number (400)', async () => {
    await admin
      .post('/doctors')
      .send({ ...newDoctor, licenseNumber: 'ABC123' })
      .expect(400)
  })
})
