import { pipeline } from 'node:stream/promises'
import type { RequestHandler } from 'express'
import { getAuditContext } from '../audit/audit.types.js'
import { patientIdParamsSchema } from '../medical-records/medical-records.schema.js'
import {
  attachmentParamsSchema,
  listAttachmentsQuerySchema,
  uploadFieldsSchema,
  voidAttachmentSchema,
} from './attachments.schema.js'
import { attachmentsService } from './attachments.service.js'
import { inspectUpload } from './uploaded-file.js'

const upload: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const file = inspectUpload(req.file)
  // With multipart/form-data, Multer puts the text fields in req.body
  const fields = uploadFieldsSchema.parse(req.body ?? {})
  const attachment = await attachmentsService.upload(patientId, file, fields, getAuditContext(req))
  res.status(201).json({ attachment })
}

const list: RequestHandler = async (req, res) => {
  const { patientId } = patientIdParamsSchema.parse(req.params)
  const query = listAttachmentsQuerySchema.parse(req.query)
  res.json(await attachmentsService.list(patientId, query, getAuditContext(req)))
}

const download: RequestHandler = async (req, res) => {
  const { patientId, attachmentId } = attachmentParamsSchema.parse(req.params)
  const file = await attachmentsService.download(patientId, attachmentId, getAuditContext(req))

  // Always a download, never shown inside the API's page, with the type saved at upload
  res.attachment(file.fileName)
  res.set({
    'Content-Type': file.mimeType,
    'Content-Length': String(file.sizeBytes),
    // The browser must trust Content-Type and not guess the type from the content
    'X-Content-Type-Options': 'nosniff',
    // Clinical files must not stay in shared or browser caches
    'Cache-Control': 'private, no-store',
  })
  // Sends the file in chunks; stops and cleans up if the client disconnects
  await pipeline(file.stream, res)
}

const review: RequestHandler = async (req, res) => {
  const { patientId, attachmentId } = attachmentParamsSchema.parse(req.params)
  const attachment = await attachmentsService.review(patientId, attachmentId, getAuditContext(req))
  res.json({ attachment })
}

const voidAttachment: RequestHandler = async (req, res) => {
  const { patientId, attachmentId } = attachmentParamsSchema.parse(req.params)
  const input = voidAttachmentSchema.parse(req.body)
  const attachment = await attachmentsService.void(
    patientId,
    attachmentId,
    input,
    getAuditContext(req),
  )
  res.json({ attachment })
}

export const attachmentsController = { upload, list, download, review, void: voidAttachment }
