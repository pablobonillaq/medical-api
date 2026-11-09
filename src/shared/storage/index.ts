import { env } from '../../config/env.js'
import { createLocalStorage } from './local-storage.js'

export type { FileStorage } from './storage.js'

// One storage for the whole app. In production this is where S3 would be plugged in.
export const storage = createLocalStorage(env.UPLOADS_DIR)
