import { AppError, BadRequestError } from '../../shared/errors/app-error.js'
import { sha256 } from './file-hash.js'
import { sanitizeFileName } from './file-name.js'
import { detectFileType } from './file-type.js'

// The parts of a Multer file this module needs (keeps it testable without Multer)
type IncomingFile = { buffer: Buffer; originalname: string; size: number }

// Checks an uploaded file and returns everything needed to store it
export const inspectUpload = (file: IncomingFile | undefined) => {
  if (!file) throw new BadRequestError('Send the file in the "file" field')
  if (file.size === 0) throw new BadRequestError('The file is empty')

  const mimeType = detectFileType(file.buffer)
  if (!mimeType) {
    throw new AppError(415, 'Only PDF, JPEG, PNG and WebP files are allowed')
  }

  return {
    data: file.buffer,
    mimeType,
    originalName: sanitizeFileName(file.originalname),
    sizeBytes: file.size,
    sha256: sha256(file.buffer),
  }
}

export type InspectedUpload = ReturnType<typeof inspectUpload>
