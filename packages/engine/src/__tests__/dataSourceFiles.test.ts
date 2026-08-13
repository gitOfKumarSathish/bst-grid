import { describe, test, expect, vi } from 'vitest'
import { createFileHandlers, createServerDataSource } from '../index'
import type { DataSource, BstFileRef } from '../index'

/** An in-memory DataSource that implements the I3 file verbs. */
function makeSource(): DataSource<{ id: string }> & { store: Map<string, BstFileRef> } {
  const store = new Map<string, BstFileRef>()
  let n = 0
  return {
    store,
    async fetch() {
      return { rows: [], totalCount: 0 }
    },
    async uploadFile(file, _ctx) {
      const id = `f${++n}`
      const ref: BstFileRef = {
        id,
        name: file.name,
        url: `https://cdn.example/${id}`,
        contentType: file.type,
        size: file.size,
      }
      store.set(id, ref)
      return ref
    },
    async deleteFile(ref) {
      store.delete(ref.id!)
    },
    async getFileUrl(ref) {
      return `https://cdn.example/${ref.id}?sig=short-lived`
    },
  }
}

const fakeFile = (name: string) => new File(['x'], name, { type: 'text/plain' })

describe('DataSource file verbs (I3, Plan.md §2.2)', () => {
  test('uploadFile returns a BstFileRef the source has stored', async () => {
    const src = makeSource()
    const ref = await src.uploadFile!(fakeFile('a.txt'))
    expect(ref).toMatchObject({ name: 'a.txt', contentType: 'text/plain' })
    expect(ref.id).toBeTruthy()
    expect(src.store.has(ref.id!)).toBe(true)
  })

  test('getFileUrl resolves a fresh (short-lived) URL; deleteFile removes it', async () => {
    const src = makeSource()
    const ref = await src.uploadFile!(fakeFile('b.txt'))
    expect(await src.getFileUrl!(ref)).toContain('short-lived')
    await src.deleteFile!(ref)
    expect(src.store.has(ref.id!)).toBe(false)
  })
})

describe('createFileHandlers — bridge verbs → files-cell onUpload/onDelete', () => {
  test('wires both verbs and threads the cell context', async () => {
    const src = makeSource()
    const upSpy = vi.spyOn(src, 'uploadFile')
    const handlers = createFileHandlers(src, { rowId: 'r1', columnId: 'files' })
    expect(typeof handlers.onUpload).toBe('function')
    expect(typeof handlers.onDelete).toBe('function')

    const ref = await handlers.onUpload!(fakeFile('c.txt'))
    expect(ref.name).toBe('c.txt')
    expect(upSpy).toHaveBeenCalledWith(expect.any(File), { rowId: 'r1', columnId: 'files' })

    await handlers.onDelete!(ref)
    expect(src.store.has(ref.id!)).toBe(false)
  })

  test('a source without file verbs yields no handlers (cell keeps its local fallback)', () => {
    const plain = createServerDataSource(async () => ({ rows: [], totalCount: 0 }))
    const handlers = createFileHandlers(plain)
    expect(handlers.onUpload).toBeUndefined()
    expect(handlers.onDelete).toBeUndefined()
  })

  test('an uploaded ref satisfies the files-cell FileLike shape (name/url/contentType)', async () => {
    const src = makeSource()
    const ref = await src.uploadFile!(fakeFile('d.png'))
    const asFileLike: { name?: string; url?: string; contentType?: string } = ref // structural superset
    expect(asFileLike.name).toBe('d.png')
    expect(asFileLike.url).toContain('https://cdn.example/')
  })
})
