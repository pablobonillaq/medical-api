import { describe, expect, it } from 'vitest'
import { detectFileType } from './file-type.js'

const bytes = (...values: number[]) => Buffer.from(values)
const withText = (text: string, ...rest: number[]) =>
  Buffer.concat([Buffer.from(text, 'ascii'), Buffer.from(rest)])

describe('detectFileType', () => {
  it('detects a PDF', () => {
    expect(detectFileType(withText('%PDF-1.7\n'))).toBe('application/pdf')
  })

  it('detects a JPEG', () => {
    expect(detectFileType(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe('image/jpeg')
  })

  it('detects a PNG', () => {
    expect(detectFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      'image/png',
    )
  })

  it('detects a WebP image', () => {
    expect(detectFileType(withText('RIFF\x24\x00\x00\x00WEBPVP8 '))).toBe('image/webp')
  })

  it('rejects other RIFF files, like WAV audio', () => {
    expect(detectFileType(withText('RIFF\x24\x00\x00\x00WAVEfmt '))).toBeNull()
  })

  it('rejects a Windows program even if it was renamed to .pdf', () => {
    // "MZ" is how .exe files start; the name the client sends does not matter
    expect(detectFileType(withText('MZ', 0x90, 0x00, 0x03))).toBeNull()
  })

  it('rejects HTML and SVG, which a browser could run as a page', () => {
    expect(detectFileType(Buffer.from('<html><script>alert(1)</script>'))).toBeNull()
    expect(detectFileType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull()
  })

  it('rejects empty and truncated files', () => {
    expect(detectFileType(Buffer.alloc(0))).toBeNull()
    expect(detectFileType(bytes(0x89, 0x50, 0x4e))).toBeNull()
    expect(detectFileType(withText('RIFF'))).toBeNull()
  })
})
