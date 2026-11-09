import { Router } from 'express'
import { attachmentsController } from './attachments.controller.js'
import { uploadSingleFile } from './upload.middleware.js'

// Mounted under /patients/:patientId/attachments. Like the rest of the medical record,
// access is decided (and denied attempts recorded) in the service, not with requireRole.
export const attachmentsRouter = Router({ mergeParams: true })

attachmentsRouter.post('/', uploadSingleFile, attachmentsController.upload)
attachmentsRouter.get('/', attachmentsController.list)
attachmentsRouter.get('/:attachmentId/download', attachmentsController.download)
attachmentsRouter.post('/:attachmentId/review', attachmentsController.review)
attachmentsRouter.post('/:attachmentId/void', attachmentsController.void)
