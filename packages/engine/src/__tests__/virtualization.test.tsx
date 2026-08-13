import { describe, test, expect, vi, beforeAll, afterAll } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  resolveVirtualization,
  virtualizationBypassReason,
  BST_SETTINGS_REGISTRY,
} from '../index'
import type { BstTableColumn, UseBstTableOptions } from '../index'

// ── Pure helpers ────────────────────────────────────────────────────────────
describe('resolveVirtualization (D1)', () => {
  test('off by default', () => {
    const r = resolveVirtualization(undefined, undefined)
    expect(r.enabled).toBe(false)
    expect(r.columns).toBe(false)
  })
  test('`true` enables rows with defaults', () => {
    const r = resolveVirtualization(true, undefined)
    expect(r).toMatchObject({ enabled: true, columns: false, overscan: 8, estimateRowSize: 36, estimateColumnSize: 150 })
  })
  test('an options object implies enabled and overrides tunables (§12)', () => {
    const r = resolveVirtualization({ overscan: 20, estimateRowSize: 48 }, undefined)
    expect(r.enabled).toBe(true)
    expect(r.overscan).toBe(20)
    expect(r.estimateRowSize).toBe(48)
    expect(r.estimateColumnSize).toBe(150)
  })
  test('column virtualization needs row virtualization on', () => {
    expect(resolveVirtualization(true, true).columns).toBe(true)
    expect(resolveVirtualization(false, true).columns).toBe(false)
    expect(resolveVirtualization(undefined, true).columns).toBe(false)
  })
})

describe('virtualizationBypassReason (D1)', () => {
  test('null when nothing incompatible is on', () => {
    expect(virtualizationBypassReason({})).toBeNull()
    expect(virtualizationBypassReason({ enableExpanding: false })).toBeNull()
  })
  test('reports each incompatible feature', () => {
    expect(virtualizationBypassReason({ enableExpanding: true })).toMatch(/master-detail/)
    expect(virtualizationBypassReason({ enableGrouping: true })).toMatch(/grouping/)
    expect(virtualizationBypassReason({ enableCellSpanning: true })).toMatch(/spanning/)
    expect(virtualizationBypassReason({ enableRowPinning: true })).toMatch(/row pinning/)
  })
  test('stable priority when several are on', () => {
    expect(virtualizationBypassReason({ enableExpanding: true, enableGrouping: true })).toMatch(
      /master-detail/,
    )
  })
})

describe('settings-sheet parity (§12)', () => {
  test('both virtualization toggles are registered in a Performance group', () => {
    const keys = BST_SETTINGS_REGISTRY.map((e) => e.key)
    expect(keys).toContain('enableVirtualization')
    expect(keys).toContain('enableColumnVirtualization')
    const row = BST_SETTINGS_REGISTRY.find((e) => e.key === 'enableVirtualization')!
    expect(row.group).toBe('Performance')
    expect(row.layer).toBe('engine')
    expect(row.default).toBe(false)
  })
})

// ── Component (windowed rendering) ───────────────────────────────────────────
// jsdom has no layout. react-virtual reads the scroll viewport from
// `offsetWidth/offsetHeight` (getRect) and each row from our `measureElement`
// (getBoundingClientRect) — so stub both: a 400px viewport over 40px rows.
const restore: Array<() => void> = []
beforeAll(() => {
  const defineDim = (prop: 'offsetWidth' | 'offsetHeight', value: number) => {
    const orig = Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop)
    Object.defineProperty(HTMLElement.prototype, prop, { configurable: true, get: () => value })
    restore.push(() => {
      if (orig) Object.defineProperty(HTMLElement.prototype, prop, orig)
      else delete (HTMLElement.prototype as Record<string, unknown>)[prop]
    })
  }
  defineDim('offsetWidth', 600)
  defineDim('offsetHeight', 400)
  const origRect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return { width: 600, height: 40, top: 0, left: 0, right: 600, bottom: 40, x: 0, y: 0, toJSON() {} } as DOMRect
  }
  restore.push(() => {
    Element.prototype.getBoundingClientRect = origRect
  })
})
afterAll(() => {
  restore.splice(0).forEach((f) => f())
})

type Row = { id: string; name: string; city: string }
const makeRows = (n: number): Row[] =>
  Array.from({ length: n }, (_, i) => ({ id: String(i), name: `Name ${i}`, city: `City ${i}` }))
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', size: 160, meta: { type: 'text' } },
  { id: 'city', accessorKey: 'city', header: 'City', size: 160, meta: { type: 'text' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>> & { data: Row[] }) {
  const t = useBstTable<Row>({ columns, getRowId: (r) => r.id, pagination: false, ...props })
  return <BstTable table={t} />
}

describe('row virtualization renders a bounded window', () => {
  test('only a slice of a large dataset is in the DOM, with a spacer for the rest', async () => {
    render(<Grid data={makeRows(500)} enableVirtualization />)
    const scroll = document.querySelector('.bst-table-scroll') as HTMLElement
    expect(scroll.classList.contains('bst-virtualized')).toBe(true)
    await waitFor(() =>
      expect(document.querySelectorAll('tr.bst-table-tr').length).toBeGreaterThan(0),
    )
    const rendered = document.querySelectorAll('tr.bst-table-tr').length
    expect(rendered).toBeLessThan(500) // windowed, not all 500 rows
    // Rows below the window are represented by a spacer <tr>, not real rows.
    expect(document.querySelectorAll('.bst-virtual-spacer').length).toBeGreaterThan(0)
  })

  test('yields (renders un-windowed) + warns when an incompatible feature is on', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <Grid
        data={makeRows(30)}
        enableVirtualization
        enableGrouping
        initialState={{ grouping: ['city'] }}
      />,
    )
    const scroll = document.querySelector('.bst-table-scroll') as HTMLElement
    expect(scroll.classList.contains('bst-virtualized')).toBe(false)
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/grouping/))
    warn.mockRestore()
  })
})

describe('onReachEnd (A2 infinite scroll hook)', () => {
  test('fires once when the whole (small) dataset is within the end threshold', async () => {
    const onReachEnd = vi.fn()
    render(<Grid data={makeRows(5)} enableVirtualization onReachEnd={onReachEnd} />)
    // All 5 rows fit in the 400px viewport → the last rendered row is the last
    // row → within threshold → fires exactly once (fire-once guard holds).
    await waitFor(() => expect(document.querySelectorAll('tr.bst-table-tr').length).toBe(5))
    await waitFor(() => expect(onReachEnd).toHaveBeenCalledTimes(1))
  })

  test('does not fire without virtualization', () => {
    const onReachEnd = vi.fn()
    render(<Grid data={makeRows(5)} onReachEnd={onReachEnd} />)
    expect(onReachEnd).not.toHaveBeenCalled()
  })
})
