import { describe, test, expect } from 'vitest'
import { createRuntime, createDefaultRegistry } from '../index'
import type { BstColumnMeta, RuntimeCtx } from '../index'

type Row = { id: string; a: number; b: number; c: string }

function makeRuntime() {
  const data: Row[] = [
    { id: '1', a: 10, b: 1, c: 'x' },
    { id: '2', a: 20, b: 2, c: 'y' },
    { id: '3', a: 30, b: 3, c: 'z' },
  ]
  const registry = createDefaultRegistry()
  const getRowId = (r: Row, i: number) => r.id ?? String(i)
  const columnIds = ['a', 'b', 'c']
  const meta: Record<string, BstColumnMeta<Row>> = {
    a: { type: 'number' },
    b: { type: 'number' },
    c: { type: 'text' },
  }
  const ctx = {
    registry,
    data,
    rowIndexById: new Map(data.map((r, i) => [getRowId(r, i), i])),
    getRowId,
    metaByColumn: new Map(columnIds.map((id) => [id, meta[id]])),
    fieldByColumn: new Map(columnIds.map((id) => [id, id])),
    headerByColumn: new Map(columnIds.map((id) => [id, id])),
    columnIds,
    visibleRowIds: ['1', '2', '3'],
    allRowIds: ['1', '2', '3'],
    visibleColumnIds: columnIds,
    rowVisualIndex: new Map(data.map((r, i) => [r.id, i])),
    colVisualIndex: new Map(columnIds.map((id, i) => [id, i])),
    enableEditing: false,
    enableValidation: false,
    enableCellSelection: true,
    enableClipboard: false,
    enableUndoRedo: false,
    policy: 'blockCommitOnError',
    saveOn: [],
    batchEditing: false,
    gridDisabled: false,
    tempIdPrefix: 'tmp_',
  } as unknown as RuntimeCtx<Row>
  return createRuntime<Row>(ctx)
}

describe('runtime.getSelectionStats (X5)', () => {
  test('null when nothing is selected', () => {
    expect(makeRuntime().getSelectionStats()).toBeNull()
  })

  test('aggregates numeric cells across a selected column range', () => {
    const rt = makeRuntime()
    rt.setActiveCell('1', 'a')
    rt.extendSelectionTo('3', 'a') // column a: 10, 20, 30
    const s = rt.getSelectionStats()!
    expect(s.count).toBe(3)
    expect(s.numericCount).toBe(3)
    expect(s.sum).toBe(60)
    expect(s.avg).toBe(20)
    expect(s.min).toBe(10)
    expect(s.max).toBe(30)
  })

  test('a mixed 2-column range counts every cell but aggregates only numerics', () => {
    const rt = makeRuntime()
    rt.setActiveCell('1', 'a')
    rt.extendSelectionTo('2', 'c') // cols a,b,c × rows 1,2 = 6 cells; a+b numeric = 10,20,1,2
    const s = rt.getSelectionStats()!
    expect(s.count).toBe(6)
    expect(s.numericCount).toBe(4)
    expect(s.sum).toBe(33)
  })

  test('a single text cell → count 1, numericCount 0, sum 0', () => {
    const rt = makeRuntime()
    rt.setActiveCell('1', 'c')
    const s = rt.getSelectionStats()!
    expect(s.count).toBe(1)
    expect(s.numericCount).toBe(0)
    expect(s.sum).toBe(0)
  })
})
