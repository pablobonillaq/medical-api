import { describe, expect, it } from 'vitest'
import { sanitizeFileName } from './file-name.js'

describe('sanitizeFileName', () => {
  it('keeps a normal name with accents', () => {
    expect(sanitizeFileName('Radiografía de tórax.pdf')).toBe('Radiografía de tórax.pdf')
  })

  it('removes folders, also Windows ones', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFileName('C:\\Users\\Ana\\estudio.pdf')).toBe('estudio.pdf')
  })

  it('removes control characters and quotes', () => {
    expect(sanitizeFileName('lab\r\nresult".pdf')).toBe('labresult.pdf')
  })

  it('limits the length to 255 characters', () => {
    expect(sanitizeFileName(`${'a'.repeat(300)}.pdf`)).toHaveLength(255)
  })

  it('uses a generic name when nothing is left', () => {
    expect(sanitizeFileName('  ')).toBe('file')
    expect(sanitizeFileName('/')).toBe('file')
  })
})
