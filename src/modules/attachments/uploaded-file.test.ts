import { describe, expect, it } from 'vitest'
import { inspectUpload } from './uploaded-file.js'

const file = (content: string | Buffer, originalname = 'estudio.pdf') => {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content)
  return { buffer, originalname, size: buffer.length }
}

// The error a function throws, to check its status code
const errorOf = (fn: () => unknown) => {
  try {
    fn()
  } catch (error) {
    return error
  }
  throw new Error('Expected the function to throw')
}

describe('inspectUpload', () => {
  it('returns the real type, a clean name, the size and the SHA-256 hash', () => {
    const result = inspectUpload(file('%PDF-1.7 hola', 'C:\\Estudios\\biometría.pdf'))

    expect(result).toMatchObject({
      mimeType: 'application/pdf',
      originalName: 'biometría.pdf',
      sizeBytes: 13,
    })
    // echo -n "%PDF-1.7 hola" | sha256sum
    expect(result.sha256).toBe('95a540ba6fd5f8848aebced70de4a0c4c249ffe38dbc451b81d560229815c749')
  })

  it('requires a file (400)', () => {
    expect(errorOf(() => inspectUpload(undefined))).toMatchObject({ statusCode: 400 })
  })

  it('rejects an empty file (400)', () => {
    expect(errorOf(() => inspectUpload(file('')))).toMatchObject({ statusCode: 400 })
  })

  it('rejects a file whose content is not an allowed type, whatever its name (415)', () => {
    expect(errorOf(() => inspectUpload(file('MZ\x90\x00', 'resultados.pdf')))).toMatchObject({
      statusCode: 415,
    })
  })
})
