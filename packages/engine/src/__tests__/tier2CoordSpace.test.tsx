import { describe, test, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import * as React from 'react'
import { useBstGrid, BstTable } from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

// Regression tests for the Tier-2 coordinate-space refactor (AUDIT_FIXES.md):
//   #3  isCellEditable must be false for grouped/aggregated/phantom rows
//   #22 keyboard nav must skip group rows (landing on one empties the clipboard)
//   #23 paste onto a group row must be skipped (no bogus onDataChange / undo)
//   #9/#21 the coord space must match the PAINTED order (pinned rows top/bottom)

type Row = { id: string; name: string; dept: string; age: number }
const seed: Row[] = [
  { id: '1', name: 'Ada', dept: 'Eng', age: 30 },
  { id: '2', name: 'Bob', dept: 'Eng', age: 40 },
  { id: '3', name: 'Cy', dept: 'Sales', age: 25 },
  { id: '4', name: 'Di', dept: 'Sales', age: 35 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', size: 120, meta: { type: 'text', editable: true } },
  { id: 'dept', accessorKey: 'dept', header: 'Dept', size: 120, meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', size: 90, meta: { type: 'number', editable: true } },
]

function Grid({
  refs,
  ...opts
}: { refs: { rt?: any; tb?: any } } & Partial<UseBstTableOptions<Row>>) {
  const [d, setD] = React.useState<Row[]>(seed)
  const { table, runtime } = useBstGrid<Row>({
    data: d,
    columns,
    getRowId: (r) => r.id,
    onDataChange: setD,
    ...opts,
  })
  refs.rt = runtime
  refs.tb = table
  return <BstTable table={table} />
}

const groupRowIds = (table: any): string[] =>
  (table.getRowModel().rows as any[]).filter((r) => r.getIsGrouped?.()).map((r) => r.id as string)
const dataRowIds = (table: any): string[] =>
  (table.getRowModel().rows as any[]).filter((r) => !r.getIsGrouped?.()).map((r) => r.id as string)

const GROUPED = { enableGrouping: true, initialState: { grouping: ['dept'], expanded: true } }

describe('Tier 2 — group/aggregated rows are not real cells', () => {
  test('#3 isCellEditable: false for a grouped row, true for a data row', () => {
    const refs: { rt?: any; tb?: any } = {}
    render(<Grid refs={refs} enableEditing {...GROUPED} />)
    const gid = groupRowIds(refs.tb)[0]
    const did = dataRowIds(refs.tb)[0]
    expect(gid).toBeTruthy()
    expect(did).toBeTruthy()
    expect(refs.rt.isCellEditable(gid, 'name')).toBe(false)
    expect(refs.rt.isCellEditable(did, 'name')).toBe(true)
  })

  test('#22 moveActive never lands on a group row', () => {
    const refs: { rt?: any; tb?: any } = {}
    render(<Grid refs={refs} enableCellSelection {...GROUPED} />)
    const groups = new Set(groupRowIds(refs.tb))
    const firstData = dataRowIds(refs.tb)[0]
    act(() => refs.rt.setActiveCell(firstData, 'name'))
    // step down through the entire grid; the active row must never be a group row
    for (let i = 0; i < 8; i++) {
      act(() => refs.rt.moveActive(1, 0))
      const active = refs.rt.store.getState().activeCell
      expect(active).toBeTruthy()
      expect(groups.has(active.rowId)).toBe(false)
    }
  })

  test('#23 paste onto a group row fires no onDataChange (skipped, not a no-op write)', () => {
    const refs: { rt?: any; tb?: any } = {}
    const onDataChange = vi.fn()
    render(<Grid refs={refs} enableEditing enableClipboard {...GROUPED} onDataChange={onDataChange} />)
    const gid = groupRowIds(refs.tb)[0]
    onDataChange.mockClear()
    act(() => {
      refs.rt.setActiveCell(gid, 'name')
      refs.rt.pasteFromText('Zed')
    })
    expect(onDataChange).not.toHaveBeenCalled()
  })
})

describe('Tier 2 — coord space matches painted order (#9/#21)', () => {
  test('a top-pinned row occupies visual index 0 (painted first)', () => {
    const refs: { rt?: any; tb?: any } = {}
    render(<Grid refs={refs} enableCellSelection enableRowPinning />)
    const rows = refs.tb.getRowModel().rows as any[]
    const last = rows[rows.length - 1] // the last row in model order
    // Before pinning it sits at the bottom of the coord space…
    expect(refs.rt.visualIndexOf(last.id, 'name')?.r).toBe(rows.length - 1)
    // …pin it to the top and the coord space must put it FIRST (paint order).
    act(() => last.pin('top'))
    expect(refs.rt.visualIndexOf(last.id, 'name')?.r).toBe(0)
  })
})
