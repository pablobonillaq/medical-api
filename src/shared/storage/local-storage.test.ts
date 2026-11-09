import { mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { text } from 'node:stream/consumers'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createLocalStorage } from './local-storage.js'
import type { FileStorage } from './storage.js'

const KEY = '0190a7b2-0000-7000-8000-000000000001'

describe('local storage', () => {
  let rootDir: string
  let storage: FileStorage

  beforeEach(async () => {
    rootDir = await mkdtemp(path.join(tmpdir(), 'medical-api-storage-'))
    storage = createLocalStorage(rootDir)
  })

  afterEach(async () => {
    await rm(rootDir, { recursive: true, force: true })
  })

  it('saves a file and reads it back', async () => {
    await storage.save(KEY, Buffer.from('resultado de laboratorio'))

    const stream = await storage.read(KEY)

    expect(await text(stream)).toBe('resultado de laboratorio')
  })

  it('never overwrites an existing file', async () => {
    await storage.save(KEY, Buffer.from('original'))

    await expect(storage.save(KEY, Buffer.from('replacement'))).rejects.toMatchObject({
      code: 'EEXIST',
    })
    expect(await text(await storage.read(KEY))).toBe('original')
  })

  it('rejects keys that could point outside the storage folder', async () => {
    await expect(storage.save('../../.env', Buffer.from('x'))).rejects.toMatchObject({
      statusCode: 400,
    })
    await expect(storage.read('../package.json')).rejects.toMatchObject({ statusCode: 400 })
  })

  it('answers 404 for a file that does not exist', async () => {
    await expect(storage.read(KEY)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('removes a file, and removing a missing file is not an error', async () => {
    await storage.save(KEY, Buffer.from('x'))

    await storage.remove(KEY)
    await storage.remove(KEY)

    await expect(storage.read(KEY)).rejects.toMatchObject({ statusCode: 404 })
  })

  it('spreads files into two levels of folders', async () => {
    await storage.save(KEY, Buffer.from('x'))

    expect(await readdir(path.join(rootDir, '01', '90'))).toEqual([KEY])
  })
})
