import { createHash } from 'node:crypto'

// SHA-256 of the file content. If the stored file is ever altered, its hash will no longer match.
export const sha256 = (data: Buffer) => createHash('sha256').update(data).digest('hex')
