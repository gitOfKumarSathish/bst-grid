// Regression test for the Tier-4 editing fix (#2, AUDIT_FIXES.md):
// cancelling a row-edit session must DISCARD its drafts. Previously the action
// cell's Cancel called cancelEditing(), which only nulled the open editor and left
// the row-session drafts intact — so the next Save persisted the cancelled value.
import { describe, test, expect } from 'vitest'
import { createRuntime, createDefaultRegistry } from '../index'
import type { BstColumnMeta, RuntimeCtx } from '../index'

type Row = { id: string; name: string; age: number | null }

function makeRuntime(initial: Row[]) {
  const registry = createDefaultRegistry()
  const getRowId = (r: Row, i: number) => r.id ?? String(i)
  let data = initial
  const meta: Record<string, BstColumnMeta<Row>> = {
    name: { type: 'text', editable: true },
    age: { type: 'number', editable: true },
  }
  const columnIds = ['name', 'age']
  const build = (): RuntimeCtx<Row> => ({
    registry,
    data,
    rowIndexById: new Map(data.map((r, i) => [getRowId(r, i), i])),
    getRowId,
    metaByColumn: new Map(columnIds.map((id) => [id, meta[id]])),
    fieldByColumn: new Map(columnIds.map((id) => [id, id])),
    columnIds,
    enableEditing: true,
    enableValidation: false,
    policy: 'blockCommitOnError',
    saveOn: ['enter', 'blur'],
    gridDisabled: false,
    tempIdPrefix: 'tmp_',
    onDataChange: (next) => {
      data = next
      runtime.updateCtx(build())
    },
  })
  const runtime = createRuntime<Row>(build())
  return {
    runtime,
    get data() {
      return data
    },
  }
}

describe('#2 cancelling a row-edit discards its drafts', () => {
  test('the cell api Cancel drops drafts, so a later Save writes nothing', () => {
    const h = makeRuntime([{ id: '1', name: 'Ada', age: 36 }])

    // Start a row-edit session and stage a draft (as inline editing would).
    h.runtime.beginRowSession('1')
    h.runtime.setDraft('1', 'name', 'CHANGED')
    expect(h.runtime.draftAwareValue('1', 'name')).toBe('CHANGED')

    // The action cell's "Cancel" button calls api.cancelEditing().
    const api = h.runtime.buildCellApi('1', 'name', h.data[0], {
      isEditing: true,
      isDirty: true,
      errors: [],
    })
    api.cancelEditing()

    // Draft discarded, no lingering session…
    expect(h.runtime.draftAwareValue('1', 'name')).toBe('Ada')
    expect(h.runtime.store.getState().rowSession).toBeNull()

    // …and a subsequent Save persists nothing (the cancelled value is gone).
    h.runtime.commitRowSession('1')
    expect(h.data[0].name).toBe('Ada')
  })

  test('a lone cell edit (no row session) still just closes the editor', () => {
    const h = makeRuntime([{ id: '1', name: 'Ada', age: 36 }])
    h.runtime.startEditing('1', 'name')
    const api = h.runtime.buildCellApi('1', 'name', h.data[0], {
      isEditing: true,
      isDirty: false,
      errors: [],
    })
    api.cancelEditing()
    expect(h.runtime.store.getState().editingCell).toBeNull()
    expect(h.data[0].name).toBe('Ada')
  })
})
