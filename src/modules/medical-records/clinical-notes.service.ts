import { prisma } from '../../db/prisma.js'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import { auditService } from '../audit/audit.service.js'
import type { AuditContext } from '../audit/audit.types.js'
import {
  authorizeRecordAccess,
  requireTreatingDoctor,
  type DoctorAccess,
} from './medical-records.access.js'
import { NOTE_APPOINTMENT_STATUSES } from './medical-records.constants.js'
import {
  medicalRecordsRepository,
  type ClinicalNoteWithAmendments,
} from './medical-records.repository.js'
import type {
  AmendClinicalNoteInput,
  CreateClinicalNoteInput,
  ListNotesQuery,
} from './medical-records.schema.js'
import { toClinicalNoteResponse } from './medical-records.types.js'

const RESOURCE = 'clinical_note'

const isNoteAppointmentStatus = (status: string) =>
  (NOTE_APPOINTMENT_STATUSES as readonly string[]).includes(status)

// The appointment must be between this doctor and this patient, and must not be cancelled or missed
const assertValidAppointment = async (appointmentId: string, access: DoctorAccess) => {
  const appointment = await medicalRecordsRepository.findAppointment(appointmentId)
  if (
    !appointment ||
    appointment.doctorId !== access.doctorId ||
    appointment.patientId !== access.patientId
  ) {
    throw new BadRequestError('appointmentId must be one of your appointments with this patient')
  }
  if (!isNoteAppointmentStatus(appointment.status)) {
    throw new BadRequestError(`Cannot add a note to a ${appointment.status} appointment`)
  }
  if (await medicalRecordsRepository.noteExistsForAppointment(appointmentId)) {
    throw new ConflictError('This appointment already has a clinical note')
  }
}

// Ids of the notes a response shows, so the audit log knows exactly what was seen
const noteIds = (notes: ClinicalNoteWithAmendments[]) =>
  notes.flatMap((note) => [note.id, ...note.amendments.map((amendment) => amendment.id)])

export const clinicalNotesService = {
  async list(patientId: string, { page, pageSize }: ListNotesQuery, ctx: AuditContext) {
    await authorizeRecordAccess(patientId, ctx, RESOURCE)

    const [notes, total] = await medicalRecordsRepository.findNotes(
      patientId,
      toSkipTake({ page, pageSize }),
    )
    await auditService.record(ctx, {
      action: 'read',
      resource: RESOURCE,
      patientId,
      details: { noteIds: noteIds(notes) },
    })
    return { notes: notes.map(toClinicalNoteResponse), page, pageSize, total }
  },

  async getById(patientId: string, noteId: string, ctx: AuditContext) {
    await authorizeRecordAccess(patientId, ctx, RESOURCE)

    const note = await medicalRecordsRepository.findNote(patientId, noteId)
    if (!note) throw new NotFoundError('Clinical note not found')

    await auditService.record(ctx, {
      action: 'read',
      resource: RESOURCE,
      patientId,
      resourceId: note.id,
      details: { noteIds: noteIds([note]) },
    })
    return toClinicalNoteResponse(note)
  },

  async create(patientId: string, input: CreateClinicalNoteInput, ctx: AuditContext) {
    const access = await requireTreatingDoctor(
      await authorizeRecordAccess(patientId, ctx, RESOURCE),
      ctx,
      RESOURCE,
    )
    const { appointmentId, ...soap } = input
    if (appointmentId) await assertValidAppointment(appointmentId, access)

    // The note and its audit entry are saved together, or neither is
    const note = await prisma.$transaction(async (tx) => {
      const created = await medicalRecordsRepository.createNote(
        { ...soap, patientId, doctorId: access.doctorId, appointmentId: appointmentId ?? null },
        tx,
      )
      await auditService.record(
        ctx,
        {
          action: 'create',
          resource: RESOURCE,
          patientId,
          resourceId: created.id,
          details: { appointmentId: appointmentId ?? null },
        },
        tx,
      )
      return created
    })

    return toClinicalNoteResponse(note)
  },

  // Notes are never edited: a correction is a new note that points to the original
  async amend(patientId: string, noteId: string, input: AmendClinicalNoteInput, ctx: AuditContext) {
    const access = await requireTreatingDoctor(
      await authorizeRecordAccess(patientId, ctx, RESOURCE),
      ctx,
      RESOURCE,
    )

    const original = await medicalRecordsRepository.findNote(patientId, noteId)
    if (!original) throw new NotFoundError('Clinical note not found')
    if (original.amendsNoteId) {
      throw new BadRequestError('Amend the original note, not an amendment')
    }
    if (original.doctorId !== access.doctorId) {
      await auditService.record(ctx, {
        action: 'denied',
        resource: RESOURCE,
        patientId,
        resourceId: original.id,
        details: { reason: 'not_author' },
      })
      throw new ForbiddenError('Only the author of a note can amend it')
    }

    const { reason, ...soap } = input
    const amendment = await prisma.$transaction(async (tx) => {
      const created = await medicalRecordsRepository.createNote(
        {
          ...soap,
          patientId,
          doctorId: access.doctorId,
          amendsNoteId: original.id,
          amendmentReason: reason,
        },
        tx,
      )
      await auditService.record(
        ctx,
        {
          action: 'create',
          resource: RESOURCE,
          patientId,
          resourceId: created.id,
          details: { amendsNoteId: original.id },
        },
        tx,
      )
      return created
    })

    return toClinicalNoteResponse(amendment)
  },
}
