import { describe, test, expect } from 'vitest'
import { render } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import {
  resolveStickyHeader,
  STICKY_DEFAULT_MAX_HEIGHT_PX,
  STICKY_ROW_PX,
  STICKY_HEADER_PX,
  resolvePageSizeChoices,
  pageSizeForChoice,
  PAGE_SIZE_ALL,
  PAGE_SIZE_ALL_APPLIED,
} from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string }
const seed: Row[] = Array.from({ length: 30 }, (_, i) => ({ id: String(i), name: `Row ${i}` }))
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
]

function Grid(props: Record<string, unknown>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}

describe('resolveStickyHeader (pure)', () => {
  test('disabled when unset / false', () => {
    expect(resolveStickyHeader(undefined)).toEqual({ enabled: false })
    expect(resolveStickyHeader(false)).toEqual({ enabled: false })
  })

  test('true → enabled with the default height', () => {
    expect(resolveStickyHeader(true)).toEqual({
      enabled: true,
      maxHeight: `${STICKY_DEFAULT_MAX_HEIGHT_PX}px`,
    })
  })

  test('an empty object implies enabled (§12) with the default height', () => {
    expect(resolveStickyHeader({})).toEqual({
      enabled: true,
      maxHeight: `${STICKY_DEFAULT_MAX_HEIGHT_PX}px`,
    })
  })

  test('numeric maxHeight → px; string maxHeight passes through', () => {
    expect(resolveStickyHeader({ maxHeight: 500 }).maxHeight).toBe('500px')
    expect(resolveStickyHeader({ maxHeight: '60vh' }).maxHeight).toBe('60vh')
  })

  test('maxRows → header allowance + rows × row estimate', () => {
    expect(resolveStickyHeader({ maxRows: 8 }).maxHeight).toBe(
      `${STICKY_HEADER_PX + 8 * STICKY_ROW_PX}px`,
    )
  })

  test('maxHeight wins over maxRows; non-positive maxRows falls back to default', () => {
    expect(resolveStickyHeader({ maxHeight: 300, maxRows: 8 }).maxHeight).toBe('300px')
    expect(resolveStickyHeader({ maxRows: 0 }).maxHeight).toBe(`${STICKY_DEFAULT_MAX_HEIGHT_PX}px`)
  })
})

describe('sticky-header render (BstTable)', () => {
  const scrollOf = (c: HTMLElement) => c.querySelector('.bst-table-scroll') as HTMLElement

  test('off by default: no class, no height var', () => {
    const { container } = render(<Grid />)
    const scroll = scrollOf(container)
    expect(scroll.classList.contains('bst-sticky-header')).toBe(false)
    expect(scroll.style.getPropertyValue('--bst-max-height')).toBe('')
  })

  test('enableStickyHeader → class + --bst-max-height from the resolved height', () => {
    const { container } = render(<Grid enableStickyHeader={{ maxRows: 10 }} />)
    const scroll = scrollOf(container)
    expect(scroll.classList.contains('bst-sticky-header')).toBe(true)
    expect(scroll.style.getPropertyValue('--bst-max-height')).toBe(
      `${STICKY_HEADER_PX + 10 * STICKY_ROW_PX}px`,
    )
  })

  test('yields to virtualization: with windowing on, the standalone class is not added', () => {
    const { container } = render(<Grid enableStickyHeader enableVirtualization />)
    const scroll = scrollOf(container)
    expect(scroll.classList.contains('bst-virtualized')).toBe(true)
    expect(scroll.classList.contains('bst-sticky-header')).toBe(false)
  })
})

describe('resolvePageSizeChoices / pageSizeForChoice (pure)', () => {
  test('plain numeric options map through; the current size stays selected', () => {
    const { choices, value } = resolvePageSizeChoices([5, 10, 20], 10)
    expect(choices).toEqual([
      { value: 5, label: '5' },
      { value: 10, label: '10' },
      { value: 20, label: '20' },
    ])
    expect(value).toBe(10)
  })

  test("'all' renders as an All choice with the sentinel value", () => {
    const { choices } = resolvePageSizeChoices([10, 'all'], 10)
    expect(choices).toEqual([
      { value: 10, label: '10' },
      { value: PAGE_SIZE_ALL, label: 'All' },
    ])
  })

  test('a non-numeric-option page size reads as "All" (only when All is offered)', () => {
    // Applied "All" size → not one of the numeric options → shows All.
    expect(resolvePageSizeChoices([10, 20, 'all'], PAGE_SIZE_ALL_APPLIED).value).toBe(PAGE_SIZE_ALL)
    // A real numeric option stays itself even if it exceeds the row count.
    expect(resolvePageSizeChoices([10, 20, 'all'], 20).value).toBe(20)
    // Without an All option, an off-list size is left as-is (no phantom All).
    expect(resolvePageSizeChoices([10, 20], 999).value).toBe(999)
  })

  test('an off-list numeric size is surfaced as its own choice (sorted), so the <select> value always matches an option', () => {
    // A consumer set `pagination: { pageSize: 8 }` but kept default options.
    const { choices, value } = resolvePageSizeChoices([5, 10, 20, 50], 8)
    expect(choices.map((c) => c.value)).toEqual([5, 8, 10, 20, 50]) // 8 injected, ascending
    expect(choices).toContainEqual({ value: 8, label: '8' })
    expect(value).toBe(8) // value ∈ choices → no MUI "out-of-range value" warning
    // When 'all' is offered, an unlisted size still reads as All (no numeric inject).
    const withAll = resolvePageSizeChoices([10, 20, 'all'], 8)
    expect(withAll.value).toBe(PAGE_SIZE_ALL)
    expect(withAll.choices.map((c) => c.value)).toEqual([10, 20, PAGE_SIZE_ALL])
  })

  test('pageSizeForChoice maps the All sentinel to the applied size, else identity', () => {
    expect(pageSizeForChoice(PAGE_SIZE_ALL)).toBe(PAGE_SIZE_ALL_APPLIED)
    expect(pageSizeForChoice(25)).toBe(25)
  })
})
