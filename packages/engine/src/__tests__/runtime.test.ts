import { describe, test, expect } from 'vitest'
import { createRuntime, createDefaultRegistry, cellKey } from '../index'
import type { BstColumnMeta, CommitPolicy, RuntimeCtx } from '../index'

type Row = { id: string; name: string; age: number | null; active: boolean; code?: string }

const flush = () => new Promise((r) => setTimeout(r, 25))

/** A controlled harness: `onDataChange` mutates local data and refreshes ctx. */
function harness(
  initial: Row[],
  opts: {
    policy?: CommitPolicy
    enableValidation?: boolean
    metaExtra?: Record<string, Partial<BstColumnMeta<Row>>>
  } = {},
) {
  const registry = createDefaultRegistry()
  const getRowId = (r: Row, i: number) => r.id ?? String(i)
  let data = initial

  const baseMeta: Record<string, BstColumnMeta<Row>> = {
    name: { type: 'text', editable: true },
    age: { type: 'number', editable: true, cellMeta: { required: true } },
    active: { type: 'boolean', editable: true },
    code: { type: 'text', editable: true },
  }
  for (const k of Object.keys(opts.metaExtra ?? {})) {
    baseMeta[k] = { ...baseMeta[k], ...opts.metaExtra![k] }
  }
  const columnIds = ['name', 'age', 'active', 'code']

  const build = (): RuntimeCtx<Row> => ({
    registry,
    data,
    rowIndexById: new Map(data.map((r, i) => [getRowId(r, i), i])),
    getRowId,
    metaByColumn: new Map(columnIds.map((id) => [id, baseMeta[id]])),
    fieldByColumn: new Map(columnIds.map((id) => [id, id])),
    columnIds,
    enableEditing: true,
    enableValidation: opts.enableValidation ?? true,
    policy: opts.policy ?? 'blockCommitOnError',
    saveOn: ['enter', 'blur'],
    gridDisabled: false,
    tempIdPrefix: 'tmp_',
    onDataChange: (next) => {
      data = next
      runtime.updateCtx(build())
    },
    createRow: () => ({ name: '', age: 0, active: false }) as Partial<Row>,
  })

  const runtime = createRuntime<Row>(build())
  return {
    runtime,
    get data() {
      return data
    },
  }
}

describe('runtime — editing', () => {
  test('commitCell persists by rowId via onDataChange', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.commitCell('1', 'name', 'Alice')
    expect(h.data[0].name).toBe('Alice')
    // draft + dirty cleared after persist
    const s = h.runtime.store.getState()
    expect(s.dirtyCells[cellKey('1', 'name')]).toBeUndefined()
    expect(s.editingCell).toBeNull()
  })

  test('draft overlay: setDraft shows value without mutating data', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.setDraft('1', 'name', 'Draft')
    expect(h.data[0].name).toBe('Al') // source untouched
    expect(h.runtime.draftAwareValue('1', 'name')).toBe('Draft')
    expect(h.runtime.store.getState().dirtyRows['1']).toBe(true)
  })

  test('blockCommitOnError keeps invalid value as dirty draft, does not persist', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.commitCell('1', 'age', null) // required → error
    expect(h.data[0].age).toBe(30) // NOT persisted
    const s = h.runtime.store.getState()
    expect(s.dirtyCells[cellKey('1', 'age')]).toBe(true)
    expect(s.cellErrors[cellKey('1', 'age')]?.[0]?.code).toBe('required')
  })

  test('commitButFlag persists invalid value AND flags the error', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }], {
      policy: 'commitButFlag',
    })
    h.runtime.commitCell('1', 'age', null)
    expect(h.data[0].age).toBeNull() // persisted despite error
    expect(h.runtime.store.getState().cellErrors[cellKey('1', 'age')]?.length).toBe(1)
  })

  test('editable=false blocks editing', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }], {
      metaExtra: { name: { editable: false } },
    })
    expect(h.runtime.isCellEditable('1', 'name')).toBe(false)
    h.runtime.commitCell('1', 'name', 'X')
    expect(h.data[0].name).toBe('Al')
  })
})

describe('runtime — row session (deferred save, C2 ≡ I2)', () => {
  test('drafts are deferred until commitRowSession persists them together', async () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.beginRowSession('1')
    h.runtime.setDraft('1', 'name', 'Bob')
    h.runtime.setDraft('1', 'age', 99)
    expect(h.data[0]).toMatchObject({ name: 'Al', age: 30 }) // nothing persisted yet
    const ok = await h.runtime.commitRowSession('1')
    expect(ok).toBe(true)
    expect(h.data[0]).toMatchObject({ name: 'Bob', age: 99 })
    expect(h.runtime.store.getState().rowSession).toBeNull()
  })

  test('invalid row session is blocked under blockCommitOnError', async () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.beginRowSession('1')
    h.runtime.setDraft('1', 'age', null)
    const ok = await h.runtime.commitRowSession('1')
    expect(ok).toBe(false)
    expect(h.data[0].age).toBe(30)
  })

  test('cancelRowSession discards drafts', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.beginRowSession('1')
    h.runtime.setDraft('1', 'name', 'X')
    h.runtime.cancelRowSession()
    const s = h.runtime.store.getState()
    expect(s.rowSession).toBeNull()
    expect(s.dirtyRows['1']).toBeUndefined()
    expect(h.runtime.draftAwareValue('1', 'name')).toBe('Al')
  })
})

describe('runtime — row lifecycle', () => {
  test('addRow appends with a temp id', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    const id = h.runtime.addRow({ name: 'New', age: 1, active: true })
    expect(h.data).toHaveLength(2)
    expect(id).toMatch(/^tmp_/)
    expect(h.data[1]).toMatchObject({ id, name: 'New', age: 1 })
  })

  test('deleteRow removes by rowId', () => {
    const h = harness([
      { id: '1', name: 'Al', age: 30, active: false },
      { id: '2', name: 'Bo', age: 40, active: true },
    ])
    h.runtime.deleteRow('1')
    expect(h.data.map((r) => r.id)).toEqual(['2'])
  })

  test('duplicateRow inserts a copy with a fresh id after the original', () => {
    const h = harness([
      { id: '1', name: 'Al', age: 30, active: false },
      { id: '2', name: 'Bo', age: 40, active: true },
    ])
    const id = h.runtime.duplicateRow('1')
    expect(h.data.map((r) => r.id)).toEqual(['1', id, '2'])
    expect(h.data[1]).toMatchObject({ name: 'Al', age: 30 })
    expect(id).toMatch(/^tmp_/)
  })

  test('getDirtyChanges reflects outstanding drafts', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }])
    h.runtime.setDraft('1', 'name', 'Z')
    const changes = h.runtime.getDirtyChanges()
    expect(changes).toEqual([{ rowId: '1', columnId: 'name', value: 'Z', row: h.data[0] }])
  })
})

describe('runtime — validation', () => {
  test('async validation resolves with last-write-wins', async () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false, code: 'AB' }], {
      metaExtra: {
        code: {
          editable: true,
          validate: (v) =>
            new Promise((res) =>
              setTimeout(
                () =>
                  res(
                    String(v).length >= 2
                      ? []
                      : [{ level: 'error', message: 'too short', code: 'len' }],
                  ),
                10,
              ),
            ),
        },
      },
    })
    h.runtime.validateCell('1', 'code', 'X') // async → error
    expect(h.runtime.store.getState().pending[cellKey('1', 'code')]).toBe(true)
    await flush()
    expect(h.runtime.store.getState().cellErrors[cellKey('1', 'code')]?.[0]?.code).toBe('len')
    expect(h.runtime.store.getState().pending[cellKey('1', 'code')]).toBeUndefined()

    h.runtime.validateCell('1', 'code', 'XYZ') // async → clears
    await flush()
    expect(h.runtime.store.getState().cellErrors[cellKey('1', 'code')]).toBeUndefined()
  })

  test('enableValidation=false skips validation entirely', () => {
    const h = harness([{ id: '1', name: 'Al', age: 30, active: false }], {
      enableValidation: false,
    })
    h.runtime.commitCell('1', 'age', null)
    expect(h.data[0].age).toBeNull() // no blocking without validation
    expect(h.runtime.store.getState().cellErrors[cellKey('1', 'age')]).toBeUndefined()
  })
})
