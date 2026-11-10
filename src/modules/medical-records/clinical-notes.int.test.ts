import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../../db/prisma.js'
import {
  createAppointment,
  createDoctorWithService,
  createPatient,
  loginAs,
  resetDatabase,
  type TestAgent,
} from '../../test/helpers.js'

describe('clinical notes (integration)', () => {
  let patient: Awaited<ReturnType<typeof createPatient>>
  let appointmentId: string
  let doctor: TestAgent
  let url: string

  const soap = {
    subjective: 'Dolor de garganta desde hace 3 días',
    objective: 'Faringe hiperémica, temperatura 37.8 °C',
    assessment: 'Faringitis aguda',
    plan: 'Paracetamol 500 mg cada 8 horas por 3 días',
  }

  beforeEach(async () => {
    await resetDatabase()
    const { doctor: doctorRecord, service } = await createDoctorWithService()
    patient = await createPatient()
    const appointment = await createAppointment({
      doctorId: doctorRecord.id,
      serviceId: service.id,
      patientId: patient.id,
    })
    appointmentId = appointment.id
    doctor = await loginAs(doctorRecord.user.email)
    url = `/patients/${patient.id}/notes`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  // A second doctor who also treats the patient
  const createOtherTreatingDoctor = async () => {
    const { doctor: other, service } = await createDoctorWithService()
    await createAppointment({ doctorId: other.id, serviceId: service.id, patientId: patient.id })
    return loginAs(other.user.email)
  }

  const createNote = async () => {
    const response = await doctor
      .post(url)
      .send({ ...soap, appointmentId })
      .expect(201)
    return response.body.note as { id: string }
  }

  it('lets the treating doctor write a note for an appointment and audits it without content', async () => {
    const response = await doctor
      .post(url)
      .send({ ...soap, appointmentId })
      .expect(201)

    expect(response.body.note).toMatchObject({
      ...soap,
      appointmentId,
      amendsNoteId: null,
      doctor: { name: 'Ana Garay' },
      amendments: [],
    })
    const entries = await prisma.auditLog.findMany({ where: { action: 'create' } })
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      resource: 'clinical_note',
      resourceId: response.body.note.id,
      details: { appointmentId },
    })
    expect(JSON.stringify(entries)).not.toContain('Faringitis')
  })

  it('allows only one note per appointment (409)', async () => {
    await createNote()

    await doctor
      .post(url)
      .send({ ...soap, appointmentId })
      .expect(409)
  })

  it("rejects another doctor's appointment (400)", async () => {
    const other = await createOtherTreatingDoctor()

    await other
      .post(url)
      .send({ ...soap, appointmentId })
      .expect(400)
  })

  it('rejects a note without the required SOAP fields (400)', async () => {
    await doctor.post(url).send({ subjective: 'Tos', plan: '' }).expect(400)
  })

  it('keeps the original untouched and shows the amendment under it', async () => {
    const note = await createNote()

    await doctor
      .post(`${url}/${note.id}/amendments`)
      .send({
        ...soap,
        plan: 'Paracetamol 500 mg cada 8 horas por 5 días',
        reason: 'Error en días',
      })
      .expect(201)

    const response = await doctor.get(`${url}/${note.id}`).expect(200)
    expect(response.body.note.plan).toBe(soap.plan)
    expect(response.body.note.amendments).toHaveLength(1)
    expect(response.body.note.amendments[0]).toMatchObject({
      amendsNoteId: note.id,
      amendmentReason: 'Error en días',
      plan: 'Paracetamol 500 mg cada 8 horas por 5 días',
    })
  })

  it('only lets the author amend a note (403)', async () => {
    const note = await createNote()
    const other = await createOtherTreatingDoctor()

    await other
      .post(`${url}/${note.id}/amendments`)
      .send({ ...soap, reason: 'Corrección' })
      .expect(403)
  })

  it('does not allow amending an amendment (400)', async () => {
    const note = await createNote()
    const amendment = await doctor
      .post(`${url}/${note.id}/amendments`)
      .send({ ...soap, reason: 'Corrección' })
      .expect(201)

    await doctor
      .post(`${url}/${amendment.body.note.id}/amendments`)
      .send({ ...soap, reason: 'Otra corrección' })
      .expect(400)
  })

  it('lists only original notes, newest first, and audits which notes were read', async () => {
    const first = await createNote()
    const second = await doctor.post(url).send(soap).expect(201)

    const response = await doctor.get(url).expect(200)

    const notes = response.body.notes as { id: string }[]
    expect(response.body.total).toBe(2)
    expect(notes.map((note) => note.id)).toEqual([second.body.note.id, first.id])
    const read = await prisma.auditLog.findFirst({ where: { action: 'read' } })
    expect(read?.details).toEqual({ noteIds: [second.body.note.id, first.id] })
  })

  it('lets patients read their notes but not write them', async () => {
    await createNote()
    const agent = await loginAs(patient.user?.email ?? '')

    const response = await agent.get(url).expect(200)
    await agent.post(url).send(soap).expect(403)

    expect(response.body.notes).toHaveLength(1)
  })

  it('never lets a note be changed or deleted, not even directly in the database', async () => {
    const note = await createNote()

    await expect(
      prisma.clinicalNote.update({ where: { id: note.id }, data: { plan: 'Otro plan' } }),
    ).rejects.toThrow()
    await expect(prisma.clinicalNote.delete({ where: { id: note.id } })).rejects.toThrow()

    const stored = await prisma.clinicalNote.findUnique({ where: { id: note.id } })
    expect(stored?.plan).toBe(soap.plan)
  })

  it('stores a blank objective as null', async () => {
    const response = await doctor
      .post(url)
      .send({ ...soap, objective: '   ', appointmentId })
      .expect(201)

    expect(response.body.note.objective).toBeNull()
  })

  it('does not accept a note for an appointment the patient missed (400)', async () => {
    await prisma.appointment.update({ where: { id: appointmentId }, data: { status: 'no_show' } })

    const response = await doctor
      .post(url)
      .send({ ...soap, appointmentId })
      .expect(400)

    expect(response.body.error).toBe('Cannot add a note to a no_show appointment')
  })

  it('returns 404 for a note that does not exist', async () => {
    const missing = `${url}/00000000-0000-4000-8000-000000000000`

    await doctor.get(missing).expect(404)
    await doctor
      .post(`${missing}/amendments`)
      .send({ ...soap, reason: 'Corrección de la dosis' })
      .expect(404)
  })
})
