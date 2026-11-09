import path from 'node:path'
import { MAX_FILE_NAME_LENGTH } from './attachments.constants.js'

// The original name is only shown to people and sent back in Content-Disposition; it is
// never used as a path. Still, keep it clean: no folders, no control characters, no quotes.
export const sanitizeFileName = (name: string) => {
  const baseName = path.basename(name.replaceAll('\\', '/'))
  const cleaned = baseName
    .normalize('NFC')
    .replace(/[\p{Cc}"]/gu, '')
    .trim()
    .slice(0, MAX_FILE_NAME_LENGTH)
  return cleaned || 'file'
}
