import { readdir } from 'node:fs/promises'
import type { Response } from 'superagent'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { env } from '../../config/env.js'
import { prisma } from '../../db/prisma.js'
import {
  createAppointment,
  createDoctorWithService,
  createPatient,
  createUser,
  loginAs,
  resetDatabase,
  type TestAgent,
} from '../../test/helpers.js'
import { attachmentsRepository } from './attachments.repository.js'
import { auditService } from '../audit/audit.service.js'

// Small files whose first bytes are real PDF and PNG signatures (fictitious content)
const PDF = Buffer.from('%PDF-1.4\n% Resultado de laboratorio ficticio\n%%EOF\n')
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01])

// Reads a download as raw bytes instead of trying to parse it
const asBuffer = (res: Response, callback: (error: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = []
  res.on('data', (chunk: Buffer) => chunks.push(chunk))
  res.on('end', () => callback(null, Buffer.concat(chunks)))
}

const countStoredFiles = async () => {
  try {
    const entries = await readdir(env.UPLOADS_DIR, { recursive: true, withFileTypes: true })
    return entries.filter((entry) => entry.isFile()).length
  } catch {
    return 0
  }
}

describe('attachments (integration)', () => {
  let patientId: string
  let doctorId: string
  let patient: TestAgent
  let doctor: TestAgent
  let employee: TestAgent
  let url: string

  beforeEach(async () => {
    await resetDatabase()
    const { doctor: doctorRecord, service } = await createDoctorWithService()
    const patientRecord = await createPatient()
    await createAppointment({
      doctorId: doctorRecord.id,
      serviceId: service.id,
      patientId: patientRecord.id,
    })
    patientId = patientRecord.id
    doctorId = doctorRecord.id
    patient = await loginAs(patientRecord.user?.email ?? '')
    doctor = await loginAs(doctorRecord.user.email)
    employee = await loginAs((await createUser('employee')).email)
    url = `/patients/${patientId}/attachments`
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  const upload = (agent: TestAgent, file = PDF, fileName = 'Química sanguínea.pdf') =>
    agent.post(url).field('category', 'lab_result').attach('file', file, fileName)

  const uploadOk = async (agent: TestAgent, file = PDF, fileName?: string) => {
    const response = await upload(agent, file, fileName).expect(201)
    return response.body.attachment as { id: string }
  }

  it('stores a patient upload as pending review and audits it without the file name', async () => {
    const filesBefore = await countStoredFiles()

    const response = await upload(patient).expect(201)

    expect(response.body.attachment).toMatchObject({
      originalName: 'Química sanguínea.pdf',
      mimeType: 'application/pdf',
      sizeBytes: PDF.length,
      category: 'lab_result',
      status: 'pending_review',
      uploadedBy: { role: 'patient' },
    })
    expect(response.body.attachment).not.toHaveProperty('storageKey')
    expect(await countStoredFiles()).toBe(filesBefore + 1)
    const entries = await prisma.auditLog.findMany({ where: { action: 'create' } })
    expect(entries).toHaveLength(1)
    expect(JSON.stringify(entries)).not.toContain('Química')
  })

  it("marks the doctor's own uploads as reviewed", async () => {
    const response = await upload(doctor, PNG, 'rx.png').expect(201)

    expect(response.body.attachment).toMatchObject({ mimeType: 'image/png', status: 'reviewed' })
  })

  it('rejects files whose content is not allowed, whatever their name (415)', async () => {
    const filesBefore = await countStoredFiles()

    await upload(patient, Buffer.from('<script>alert(1)</script>'), 'resultado.pdf').expect(415)

    expect(await prisma.attachment.count()).toBe(0)
    expect(await countStoredFiles()).toBe(filesBefore)
  })

  it('rejects files larger than 10 MB (413)', async () => {
    const big = Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)])

    await upload(patient, big, 'big.pdf').expect(413)
  })

  it('downloads the exact bytes with safe headers', async () => {
    const attachment = await uploadOk(patient)

    const response = await patient
      .get(`${url}/${attachment.id}/download`)
      .buffer(true)
      .parse(asBuffer)
      .expect(200)

    expect(Buffer.compare(response.body as Buffer, PDF)).toBe(0)
    expect(response.headers).toMatchObject({
      'content-type': 'application/pdf',
      'x-content-type-options': 'nosniff',
      'cache-control': 'private, no-store',
    })
    expect(response.headers['content-disposition']).toContain(
      "filename*=UTF-8''Qu%C3%ADmica%20sangu%C3%ADnea.pdf",
    )
  })

  it('lets the front desk upload and list its own files, but never download', async () => {
    await uploadOk(patient)
    const own = await uploadOk(employee)

    const list = await employee.get(url).expect(200)
    await employee.get(`${url}/${own.id}/download`).expect(403)

    expect(list.body.total).toBe(1)
    expect(list.body.attachments[0]).toMatchObject({ id: own.id, status: 'pending_review' })
    const denied = await prisma.auditLog.count({ where: { action: 'denied' } })
    expect(denied).toBe(1)
  })

  it('lets only the treating doctor review a file, and only once', async () => {
    const attachment = await uploadOk(patient)

    await patient.post(`${url}/${attachment.id}/review`).expect(403)
    const response = await doctor.post(`${url}/${attachment.id}/review`).expect(200)
    await doctor.post(`${url}/${attachment.id}/review`).expect(409)

    expect(response.body.attachment.status).toBe('reviewed')
  })

  it('hides a voided file from the patient but keeps it for the doctor', async () => {
    const attachment = await uploadOk(patient)

    await doctor
      .post(`${url}/${attachment.id}/void`)
      .send({ reason: 'Estudio de otro paciente' })
      .expect(200)
    await doctor.post(`${url}/${attachment.id}/void`).send({ reason: 'Otra vez' }).expect(409)

    const patientList = await patient.get(url).expect(200)
    await patient.get(`${url}/${attachment.id}/download`).expect(404)
    const doctorList = await doctor.get(url).query({ includeVoided: true }).expect(200)

    expect(patientList.body.total).toBe(0)
    expect(doctorList.body.attachments[0]).toMatchObject({
      status: 'voided',
      voidReason: 'Estudio de otro paciente',
    })
    expect(await prisma.attachment.count()).toBe(1)
  })

  it('only links files to clinical notes of the same patient', async () => {
    const other = await createPatient()
    const note = await prisma.clinicalNote.create({
      data: {
        patientId: other.id,
        doctorId,
        subjective: 'Tos',
        assessment: 'Resfriado común',
        plan: 'Reposo',
      },
    })

    await doctor
      .post(url)
      .field('clinicalNoteId', note.id)
      .attach('file', PDF, 'estudio.pdf')
      .expect(400)
    await patient
      .post(url)
      .field('clinicalNoteId', note.id)
      .attach('file', PDF, 'estudio.pdf')
      .expect(403)
  })

  it('hides the record from doctors who do not treat the patient and from admins (404)', async () => {
    const { doctor: otherDoctor } = await createDoctorWithService()
    const otherAgent = await loginAs(otherDoctor.user.email)
    const admin = await loginAs((await createUser('admin')).email)

    await upload(otherAgent).expect(404)
    await admin.get(url).expect(404)
  })

  it('removes the stored file when saving its record fails', async () => {
    vi.spyOn(attachmentsRepository, 'create').mockRejectedValue(new Error('database down'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const filesBefore = await countStoredFiles()

    await upload(patient).expect(500)

    expect(await countStoredFiles()).toBe(filesBefore)
  })

  it('never lets a file record be deleted or rewritten in the database', async () => {
    const attachment = await uploadOk(patient)

    await expect(prisma.attachment.delete({ where: { id: attachment.id } })).rejects.toThrow()
    await expect(
      prisma.attachment.update({
        where: { id: attachment.id },
        data: { originalName: 'otro.pdf' },
      }),
    ).rejects.toThrow()
    expect(await prisma.attachment.count()).toBe(1)
  })

  it('saves an optional description, and treats a blank one as none', async () => {
    const described = await patient
      .post(url)
      .field('description', '  Estudio de control  ')
      .attach('file', PDF, 'control.pdf')
      .expect(201)
    const blank = await patient
      .post(url)
      .field('description', '   ')
      .attach('file', PDF, 'otro.pdf')
      .expect(201)

    expect(described.body.attachment.description).toBe('Estudio de control')
    expect(blank.body.attachment.description).toBeNull()
  })

  it('links a doctor upload to a clinical note of the same patient', async () => {
    const note = await prisma.clinicalNote.create({
      data: {
        patientId,
        doctorId,
        subjective: 'Dolor lumbar',
        assessment: 'Lumbalgia mecánica',
        plan: 'Radiografía de columna',
      },
    })

    const response = await doctor
      .post(url)
      .field('clinicalNoteId', note.id)
      .attach('file', PNG, 'rx.png')
      .expect(201)

    expect(response.body.attachment.clinicalNoteId).toBe(note.id)
  })

  it('returns 404 for a file that does not exist', async () => {
    await doctor.get(`${url}/00000000-0000-4000-8000-000000000000/download`).expect(404)
  })

  it('reports multipart problems as 400', async () => {
    const wrongField = await patient.post(url).attach('document', PDF, 'a.pdf').expect(400)
    const twoFiles = await patient
      .post(url)
      .attach('file', PDF, 'a.pdf')
      .attach('file', PNG, 'b.png')
      .expect(400)
    const longField = await patient
      .post(url)
      .field('description', 'x'.repeat(11 * 1024))
      .attach('file', PDF, 'a.pdf')
      .expect(400)

    expect(wrongField.body.error).toBe('Send exactly one file, in the "file" field')
    expect(twoFiles.body.error).toBe('Send exactly one file, in the "file" field')
    expect(longField.body.error).toBe('Field value too long')
    expect(await prisma.attachment.count()).toBe(0)
  })

  it('does not send the file when its download cannot be audited', async () => {
    const attachment = await uploadOk(patient)
    vi.spyOn(auditService, 'record').mockRejectedValue(new Error('audit log unavailable'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)

    await patient.get(`${url}/${attachment.id}/download`).expect(500)
  })
})
