import { randomUUID } from 'node:crypto'
import type { Readable } from 'node:stream'
import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/app-error.js'
import { toSkipTake } from '../../shared/schemas/common.js'
import { storage } from '../../shared/storage/index.js'
import { auditService } from '../audit/audit.service.js'
import type { AuditContext } from '../audit/audit.types.js'
import {
  authorizeRecordAccess,
  requireTreatingDoctor,
  type RecordAccess,
} from '../medical-records/medical-records.access.js'
import { attachmentsRepository } from './attachments.repository.js'
import type {
  ListAttachmentsQuery,
  UploadFields,
  VoidAttachmentInput,
} from './attachments.schema.js'
import { toAttachmentResponse } from './attachments.types.js'
import type { InspectedUpload } from './uploaded-file.js'

const RESOURCE = 'attachment'

// Doctors, the patient and the front desk can upload; admins and other patients get 404
const authorize = (patientId: string, ctx: AuditContext) =>
  authorizeRecordAccess(patientId, ctx, RESOURCE, { allowFrontDesk: true })

const findAttachmentOrThrow = async (patientId: string, attachmentId: string) => {
  const attachment = await attachmentsRepository.findById(patientId, attachmentId)
  if (!attachment) throw new NotFoundError('Attachment not found')
  return attachment
}

// What each role lists: the front desk only sees the files it uploaded itself
const listFilter = (
  access: RecordAccess,
  ctx: AuditContext,
  includeVoided: boolean,
): Prisma.AttachmentWhereInput => ({
  patientId: access.patientId,
  ...(access.kind === 'employee' && { uploadedById: ctx.actor.id }),
  ...(!(includeVoided && access.kind === 'doctor') && { voidedAt: null }),
})

export const attachmentsService = {
  async upload(
    patientId: string,
    file: InspectedUpload,
    { category, description, clinicalNoteId }: UploadFields,
    ctx: AuditContext,
  ) {
    const access = await authorize(patientId, ctx)

    if (clinicalNoteId) {
      if (access.kind !== 'doctor') {
        throw new ForbiddenError('Only the treating doctor can link a file to a clinical note')
      }
      const note = await attachmentsRepository.findNoteOfPatient(clinicalNoteId, patientId)
      if (!note) throw new BadRequestError('clinicalNoteId must be a note of this patient')
    }

    // 1. The file goes to storage under a random name
    const storageKey = randomUUID()
    await storage.save(storageKey, file.data)

    try {
      // 2. Its record and audit entry are saved together
      const attachment = await prisma.$transaction(async (tx) => {
        const created = await attachmentsRepository.create(
          {
            patientId,
            category,
            description: description ?? null,
            clinicalNoteId: clinicalNoteId ?? null,
            uploadedById: ctx.actor.id,
            uploaderRole: ctx.actor.role,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            sha256: file.sha256,
            storageKey,
            // A doctor's own upload needs no review; files from patients and the front desk do
            ...(access.kind === 'doctor' && {
              reviewedById: ctx.actor.id,
              reviewedAt: new Date(),
            }),
          },
          tx,
        )
        // Metadata only: the file name could reveal clinical information, so it is not logged
        await auditService.record(
          ctx,
          {
            action: 'create',
            resource: RESOURCE,
            patientId,
            resourceId: created.id,
            details: {
              category: created.category,
              mimeType: file.mimeType,
              sizeBytes: file.sizeBytes,
            },
          },
          tx,
        )
        return created
      })
      return toAttachmentResponse(attachment)
    } catch (error) {
      // 3. No record, no file: never leave orphan files in storage
      await storage.remove(storageKey)
      throw error
    }
  },

  async list(
    patientId: string,
    { page, pageSize, includeVoided }: ListAttachmentsQuery,
    ctx: AuditContext,
  ) {
    const access = await authorize(patientId, ctx)

    const [attachments, total] = await attachmentsRepository.findMany(
      listFilter(access, ctx, includeVoided),
      toSkipTake({ page, pageSize }),
    )
    await auditService.record(ctx, {
      action: 'read',
      resource: RESOURCE,
      patientId,
      details: { attachmentIds: attachments.map((attachment) => attachment.id) },
    })
    return { attachments: attachments.map(toAttachmentResponse), page, pageSize, total }
  },

  // Returns the file stream plus what the controller needs for the response headers
  async download(
    patientId: string,
    attachmentId: string,
    ctx: AuditContext,
  ): Promise<{ stream: Readable; mimeType: string; sizeBytes: number; fileName: string }> {
    const access = await authorize(patientId, ctx)
    const attachment = await findAttachmentOrThrow(patientId, attachmentId)

    // The front desk can upload, but never open clinical files
    if (access.kind === 'employee') {
      await auditService.record(ctx, {
        action: 'denied',
        resource: RESOURCE,
        patientId,
        resourceId: attachment.id,
        details: { reason: 'front_desk_cannot_download' },
      })
      throw new ForbiddenError('Front desk staff cannot open clinical files')
    }
    // Only the treating doctor can still open a voided file
    if (attachment.voidedAt && access.kind !== 'doctor') {
      throw new NotFoundError('Attachment not found')
    }

    const stream = await storage.read(attachment.storageKey)
    try {
      await auditService.record(ctx, {
        action: 'read',
        resource: RESOURCE,
        patientId,
        resourceId: attachment.id,
        details: { download: true },
      })
    } catch (error) {
      // No audit entry, no download
      stream.destroy()
      throw error
    }
    return {
      stream,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
      fileName: attachment.originalName,
    }
  },

  async review(patientId: string, attachmentId: string, ctx: AuditContext) {
    await requireTreatingDoctor(await authorize(patientId, ctx), ctx, RESOURCE)
    const attachment = await findAttachmentOrThrow(patientId, attachmentId)

    await prisma.$transaction(async (tx) => {
      const { count } = await attachmentsRepository.markReviewed(attachment.id, ctx.actor.id, tx)
      if (count === 0) {
        throw new ConflictError('The attachment was already reviewed or is voided')
      }
      await auditService.record(
        ctx,
        {
          action: 'update',
          resource: RESOURCE,
          patientId,
          resourceId: attachment.id,
          details: { reviewed: true },
        },
        tx,
      )
    })
    return toAttachmentResponse(await findAttachmentOrThrow(patientId, attachmentId))
  },

  // A wrong file is voided (hidden and kept), never deleted
  async void(
    patientId: string,
    attachmentId: string,
    { reason }: VoidAttachmentInput,
    ctx: AuditContext,
  ) {
    await requireTreatingDoctor(await authorize(patientId, ctx), ctx, RESOURCE)
    const attachment = await findAttachmentOrThrow(patientId, attachmentId)

    await prisma.$transaction(async (tx) => {
      const { count } = await attachmentsRepository.markVoided(
        attachment.id,
        { voidedById: ctx.actor.id, voidReason: reason },
        tx,
      )
      if (count === 0) throw new ConflictError('The attachment is already voided')
      await auditService.record(
        ctx,
        {
          action: 'update',
          resource: RESOURCE,
          patientId,
          resourceId: attachment.id,
          details: { voided: true },
        },
        tx,
      )
    })
    return toAttachmentResponse(await findAttachmentOrThrow(patientId, attachmentId))
  },
}
