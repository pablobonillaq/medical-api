export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const MAX_FILE_NAME_LENGTH = 255
