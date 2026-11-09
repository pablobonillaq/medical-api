import type { RequestHandler } from 'express'
import multer from 'multer'
import { AppError, BadRequestError } from '../../shared/errors/app-error.js'
import { MAX_FILE_SIZE_BYTES } from './attachments.constants.js'

// The file stays in memory (10 MB at most) until its content is checked; only then is it stored
const parseSingleFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1, fields: 10, fieldSize: 10 * 1024 },
  // Read file names as UTF-8, so "radiografía.pdf" keeps its accent
  defParamCharset: 'utf8',
}).single('file')

const toAppError = (error: multer.MulterError) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    return new AppError(413, `The file must be at most ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`)
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE' || error.code === 'LIMIT_FILE_COUNT') {
    return new BadRequestError('Send exactly one file, in the "file" field')
  }
  return new BadRequestError(error.message)
}

// Multer reports its errors through next(); they become our usual 400/413 responses
export const uploadSingleFile: RequestHandler = (req, res, next) => {
  parseSingleFile(req, res, (error: unknown) => {
    next(error instanceof multer.MulterError ? toAppError(error) : error)
  })
}
