import type { Readable } from 'node:stream'

// Where uploaded files live. The app only talks to this interface, so the local disk
// used in development can be replaced by S3 (or similar) without touching the modules.
export interface FileStorage {
  // Fails if the key already exists: stored files are never overwritten
  save(key: string, data: Buffer): Promise<void>
  // Throws NotFoundError if the file does not exist
  read(key: string): Promise<Readable>
  // Only used to clean up when saving the database record fails
  remove(key: string): Promise<void>
}
