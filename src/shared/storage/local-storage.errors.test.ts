import type * as fsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { describe, expect, it, vi } from 'vitest'
import { createLocalStorage } from './local-storage.js'

// The disk answers with an error that is not "file not found" (e.g. no permission)
vi.mock('node:fs/promises', async (importOriginal) => ({
  ...(await importOriginal<typeof fsPromises>()),
  stat: () => Promise.reject(Object.assign(new Error('permission denied'), { code: 'EACCES' })),
}))

describe('local storage errors', () => {
  it('passes on errors other than a missing file', async () => {
    const storage = createLocalStorage(tmpdir())

    await expect(storage.read('0190a7b2-0000-7000-8000-000000000001')).rejects.toMatchObject({
      code: 'EACCES',
    })
  })
})
