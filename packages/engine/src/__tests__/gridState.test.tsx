import { describe, test, expect } from 'vitest'
import { render, act } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  getGridState,
  applyGridState,
  resetGridState,
  emptyGridState,
  loadGridState,
  saveGridState,
  clearGridState,
  useBstGridState,
  BST_GRID_STATE_VERSION,
} from '../index'
import type {
  BstTableColumn,
  BstGridState,
  BstGridStateStorage,
  BstGridStateController,
} from '../index'

/**
 * Grid-state save/restore (AG21). `getGridState` / `applyGridState` snapshot and
 * restore a grid's view (sort · filter · column layout · grouping · …);
 * `loadGridState` feeds `initialState` for a flash-free restore; `useBstGridState`
 * persists changes to storage.
 */
type Row = { id: string; name: string; age: number; city: string }
const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36, city: 'London' },
  { id: '2', name: 'Bo', age: 24, city: 'Paris' },
  { id: '3', name: 'Cy', age: 48, city: 'Rome' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
  { id: 'city', accessorKey: 'city', header: 'City', meta: { type: 'text' } },
]

function makeStorage(): BstGridStateStorage & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  }
}

function mountGrid(initialState?: Record<string, unknown>) {
  const ref: { table?: any } = {}
  function G() {
    const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, initialState })
    ref.table = t
    return (
      <div className="bst-table-root">
        <BstTable table={t} />
      </div>
    )
  }
  render(<G />)
  return ref
}

describe('grid-state — snapshot / restore (AG21)', () => {
  test('getGridState captures sort + visibility + order from the live table', () => {
    const ref = mountGrid()
    act(() => {
      ref.table.setSorting([{ id: 'age', desc: true }])
      ref.table.setColumnVisibility({ city: false })
      ref.table.setColumnOrder(['age', 'name', 'city'])
    })
    const s = getGridState(ref.table)
    expect(s.version).toBe(BST_GRID_STATE_VERSION)
    expect(s.sorting).toEqual([{ id: 'age', desc: true }])
    expect(s.columnVisibility).toEqual({ city: false })
    expect(s.columnOrder).toEqual(['age', 'name', 'city'])
  })

  test('getGridState include/exclude narrows the captured slices', () => {
    const ref = mountGrid()
    act(() => {
      ref.table.setSorting([{ id: 'name', desc: false }])
      ref.table.setColumnVisibility({ city: false })
    })
    const only = getGridState(ref.table, { include: ['sorting'] })
    expect(only.sorting).toBeDefined()
    expect(only.columnVisibility).toBeUndefined()
    const without = getGridState(ref.table, { exclude: ['columnVisibility'] })
    expect(without.sorting).toBeDefined()
    expect(without.columnVisibility).toBeUndefined()
  })

  test('applyGridState restores a snapshot onto the grid', () => {
    const ref = mountGrid()
    act(() =>
      applyGridState(ref.table, {
        version: BST_GRID_STATE_VERSION,
        sorting: [{ id: 'name', desc: false }],
        columnVisibility: { age: false },
        columnOrder: ['city', 'name', 'age'],
      }),
    )
    const s = getGridState(ref.table)
    expect(s.sorting).toEqual([{ id: 'name', desc: false }])
    expect(s.columnVisibility).toEqual({ age: false })
    expect(s.columnOrder).toEqual(['city', 'name', 'age'])
  })

  test('applyGridState drops entries for columns that no longer exist', () => {
    const ref = mountGrid()
    act(() =>
      applyGridState(ref.table, {
        version: BST_GRID_STATE_VERSION,
        columnOrder: ['ghost', 'age', 'name', 'city'],
        sorting: [
          { id: 'ghost', desc: true },
          { id: 'age', desc: false },
        ],
        columnVisibility: { ghost: false, city: false },
        columnPinning: { start: ['ghost', 'name'], end: [] },
      }),
    )
    const s = getGridState(ref.table)
    expect(s.columnOrder).toEqual(['age', 'name', 'city']) // ghost gone
    expect(s.sorting).toEqual([{ id: 'age', desc: false }]) // ghost gone
    expect(s.columnVisibility).toEqual({ city: false }) // ghost gone
    expect(s.columnPinning).toEqual({ start: ['name'], end: [] })
  })

  test('round-trip: snapshot → mutate → restore returns to the snapshot', () => {
    const ref = mountGrid()
    act(() => ref.table.setSorting([{ id: 'city', desc: true }]))
    const saved = getGridState(ref.table)
    act(() => {
      ref.table.setSorting([])
      ref.table.setColumnVisibility({ name: false })
    })
    act(() => applyGridState(ref.table, saved))
    const s = getGridState(ref.table)
    expect(s.sorting).toEqual([{ id: 'city', desc: true }])
    expect(s.columnVisibility).toEqual({}) // name visible again
  })

  test('resetGridState clears layout (sort/filter) but leaves pagination', () => {
    const ref = mountGrid()
    act(() => {
      ref.table.setSorting([{ id: 'age', desc: true }])
      ref.table.setPagination({ pageIndex: 0, pageSize: 5 })
    })
    act(() => resetGridState(ref.table))
    const s = getGridState(ref.table)
    expect(s.sorting).toEqual([])
    expect(s.pagination).toEqual({ pageIndex: 0, pageSize: 5 }) // untouched
  })

  test('emptyGridState omits pagination + rowSelection by default', () => {
    const e = emptyGridState()
    expect(e.sorting).toEqual([])
    expect(e.columnPinning).toEqual({ start: [], end: [] })
    expect(e.pagination).toBeUndefined()
    expect(e.rowSelection).toBeUndefined()
  })
})

describe('grid-state — persistence', () => {
  test('save / load round-trip; incompatible version is ignored', () => {
    const storage = makeStorage()
    const snap: BstGridState = {
      version: BST_GRID_STATE_VERSION,
      sorting: [{ id: 'age', desc: true }],
    }
    saveGridState('k', snap, storage)
    expect(loadGridState('k', storage)).toEqual(snap)
    // a snapshot from a newer/older schema is dropped
    storage.map.set('bst-table:state:k', JSON.stringify({ version: 999, sorting: [] }))
    expect(loadGridState('k', storage)).toBeUndefined()
    // absent + cleared → undefined
    expect(loadGridState('missing', storage)).toBeUndefined()
    saveGridState('k', snap, storage)
    clearGridState('k', storage)
    expect(loadGridState('k', storage)).toBeUndefined()
  })

  test('a loaded snapshot fed to initialState restores on mount (flash-free)', () => {
    const storage = makeStorage()
    saveGridState(
      'view1',
      {
        version: BST_GRID_STATE_VERSION,
        sorting: [{ id: 'age', desc: true }],
        columnVisibility: { city: false },
      },
      storage,
    )
    const ref = mountGrid(loadGridState('view1', storage) as Record<string, unknown>)
    const s = getGridState(ref.table)
    expect(s.sorting).toEqual([{ id: 'age', desc: true }])
    expect(s.columnVisibility).toEqual({ city: false })
  })
})

describe('grid-state — useBstGridState hook', () => {
  test('persists changes to storage and reset() clears the view', () => {
    const storage = makeStorage()
    const ref: { table?: any; ctrl?: BstGridStateController } = {}
    function G() {
      const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
      ref.ctrl = useBstGridState(t, { key: 'orders', storage, debounceMs: 0 })
      ref.table = t
      return (
        <div className="bst-table-root">
          <BstTable table={t} />
        </div>
      )
    }
    render(<G />)

    // a change is persisted (first mount run is skipped, so this is the first write)
    act(() => ref.table.setSorting([{ id: 'age', desc: true }]))
    expect(loadGridState('orders', storage)?.sorting).toEqual([{ id: 'age', desc: true }])

    // reset() clears the view; auto-persist then saves the default view
    act(() => ref.ctrl!.reset())
    expect(getGridState(ref.table).sorting).toEqual([])
    expect(loadGridState('orders', storage)?.sorting).toEqual([])
  })

  test('controller.clear() removes the persisted snapshot', () => {
    const storage = makeStorage()
    const ref: { table?: any; ctrl?: BstGridStateController } = {}
    function G() {
      const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
      ref.ctrl = useBstGridState(t, { key: 'o', storage, debounceMs: 0 })
      ref.table = t
      return (
        <div className="bst-table-root">
          <BstTable table={t} />
        </div>
      )
    }
    render(<G />)
    act(() => ref.table.setColumnVisibility({ city: false }))
    expect(loadGridState('o', storage)).toBeDefined()
    act(() => ref.ctrl!.clear())
    expect(loadGridState('o', storage)).toBeUndefined()
  })

  test('persist:false keeps storage untouched', () => {
    const storage = makeStorage()
    const ref: { table?: any } = {}
    function G() {
      const t = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id })
      useBstGridState(t, { key: 'np', storage, persist: false, debounceMs: 0 })
      ref.table = t
      return (
        <div className="bst-table-root">
          <BstTable table={t} />
        </div>
      )
    }
    render(<G />)
    act(() => ref.table.setSorting([{ id: 'name', desc: true }]))
    expect(loadGridState('np', storage)).toBeUndefined()
    expect(storage.map.size).toBe(0)
  })
})
