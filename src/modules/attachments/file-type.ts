import type { AllowedMimeType } from './attachments.constants.js'

// Every file format starts with a known sequence of bytes ("magic number").
// The browser's Content-Type and the file extension are chosen by the client and can lie;
// these bytes are the file's real content.
const startsWith = (buffer: Buffer, bytes: number[], offset = 0) =>
  buffer.length >= offset + bytes.length &&
  bytes.every((byte, index) => buffer[offset + index] === byte)

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0))

const SIGNATURES: { mime: AllowedMimeType; matches: (buffer: Buffer) => boolean }[] = [
  // "%PDF-"
  { mime: 'application/pdf', matches: (b) => startsWith(b, ascii('%PDF-')) },
  // FF D8 FF
  { mime: 'image/jpeg', matches: (b) => startsWith(b, [0xff, 0xd8, 0xff]) },
  // 89 "PNG" CR LF 1A LF
  {
    mime: 'image/png',
    matches: (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  // "RIFF", 4 bytes with the size, then "WEBP"
  {
    mime: 'image/webp',
    matches: (b) => startsWith(b, ascii('RIFF')) && startsWith(b, ascii('WEBP'), 8),
  },
]

// Returns the real type of an allowed file, or null for anything else
export const detectFileType = (buffer: Buffer): AllowedMimeType | null =>
  SIGNATURES.find((signature) => signature.matches(buffer))?.mime ?? null
