import { describe, test, expect, vi } from 'vitest'
import { render, screen, waitFor, act, renderHook } from '@testing-library/react'
import * as React from 'react'
import {
  createClientDataSource,
  createServerDataSource,
  useBstDataSource,
  useBstTable,
  BstTable,
} from '../index'
import type { BstTableColumn, DataSource } from '../index'

type Row = { id: string; name: string; age: number }
const seed: Row[] = [
  { id: '1', name: 'Charlie', age: 30 },
  { id: '2', name: 'Alice', age: 25 },
  { id: '3', name: 'Bob', age: 40 },
  { id: '4', name: 'Dave', age: 22 },
  { id: '5', name: 'Eve', age: 35 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

/* ----------------------------------------------- ClientDataSource (pure) */

describe('createClientDataSource', () => {
  const src = createClientDataSource(seed)

  test('sorts + paginates and reports the full totalCount', async () => {
    const p = await src.fetch({ sort: [{ id: 'name', desc: false }], filters: [], offset: 0, limit: 2 })
    expect(p.totalCount).toBe(5)
    expect(p.rows.map((r) => r.name)).toEqual(['Alice', 'Bob'])
    const p2 = await src.fetch({ sort: [{ id: 'name', desc: false }], filters: [], offset: 2, limit: 2 })
    expect(p2.rows.map((r) => r.name)).toEqual(['Charlie', 'Dave'])
  })

  test('applies per-column operator filters', async () => {
    const p = await src.fetch({
      sort: [{ id: 'age', desc: true }],
      filters: [{ id: 'age', value: { op: 'gte', value: 30 } }],
      offset: 0,
      limit: 10,
    })
    expect(p.totalCount).toBe(3) // 30, 40, 35
    expect(p.rows.map((r) => r.age)).toEqual([40, 35, 30]) // desc
  })

  test('applies the quick filter across fields', async () => {
    const p = await src.fetch({ sort: [], filters: [], quickFilter: 'ali', offset: 0, limit: 10 })
    expect(p.totalCount).toBe(1)
    expect(p.rows[0].name).toBe('Alice')
  })

  test('honours an abort signal', async () => {
    const c = new AbortController()
    c.abort()
    await expect(
      createClientDataSource(seed, { delayMs: 1 }).fetch(
        { sort: [], filters: [], offset: 0, limit: 5 },
        c.signal,
      ),
    ).rejects.toThrow()
  })
})

/* ------------------------------------------------ useBstDataSource hook */

describe('useBstDataSource', () => {
  test('fetches page 0 on mount, then a later page on demand', async () => {
    const src = createClientDataSource(seed)
    const { result } = renderHook(() => useBstDataSource(src, { pageSize: 2, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.totalCount).toBe(5)
    expect(result.current.rows).toHaveLength(2)

    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 2 }))
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(['5']))
  })

  test('changing a filter resets to page 0', async () => {
    const src = createClientDataSource(seed)
    const { result } = renderHook(() => useBstDataSource(src, { pageSize: 2, debounceMs: 0 }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 2, pageSize: 2 }))
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageIndex).toBe(2))
    act(() =>
      result.current.tableProps.onGlobalFilterChange('e'), // matches several rows
    )
    await waitFor(() => expect(result.current.tableProps.state.pagination.pageIndex).toBe(0))
  })

  test('surfaces a fetch error', async () => {
    const failing: DataSource<Row> = createServerDataSource(async () => {
      throw new Error('boom')
    })
    const { result } = renderHook(() => useBstDataSource(failing, { debounceMs: 0 }))
    await waitFor(() => expect(result.current.error?.message).toBe('boom'))
    expect(result.current.loading).toBe(false)
  })

  test('ignores a stale (superseded) response', async () => {
    // First fetch resolves LATE, second resolves fast → the fast (latest) wins.
    let call = 0
    const src: DataSource<Row> = createServerDataSource((q) => {
      call++
      const mine = call
      const delay = mine === 1 ? 60 : 5
      return new Promise((res) =>
        setTimeout(() => res({ rows: [{ id: String(mine), name: 'x', age: 0 }], totalCount: mine }), delay),
      )
    })
    const { result } = renderHook(() => useBstDataSource(src, { pageSize: 2, debounceMs: 0 }))
    // trigger a second request before the first resolves
    act(() => result.current.tableProps.onPaginationChange({ pageIndex: 1, pageSize: 2 }))
    await waitFor(() => expect(result.current.totalCount).toBe(2)) // second request
    // give the slow first request time to (wrongly) land, then re-assert
    await new Promise((r) => setTimeout(r, 80))
    expect(result.current.totalCount).toBe(2)
  })
})

/* --------------------------------------- useBstTable manual (server) mode */

describe('useBstTable — manual/server mode passthrough', () => {
  test('rowCount drives the page count; nextPage calls onPaginationChange', () => {
    const onPaginationChange = vi.fn()
    const { result } = renderHook(() =>
      useBstTable<Row>({
        data: seed.slice(0, 2), // just the current page
        columns,
        getRowId: (r) => r.id,
        manualPagination: true,
        rowCount: 100,
        state: { pagination: { pageIndex: 0, pageSize: 10 } },
        onPaginationChange,
      }),
    )
    const table = result.current as any
    expect(table.getRowCount()).toBe(100)
    expect(table.getPageCount()).toBe(10)
    expect(table.getCanNextPage()).toBe(true)
    act(() => table.nextPage())
    expect(onPaginationChange).toHaveBeenCalled()
  })
})

/* ------------------------------------------------ end-to-end grid render */

function Grid({ src }: { src: DataSource<Row> }) {
  const ds = useBstDataSource(src, { pageSize: 2, debounceMs: 0 })
  const table = useBstTable<Row>({ columns, getRowId: (r) => r.id, ...ds.tableProps })
  return (
    <div>
      <span data-testid="total">{ds.totalCount}</span>
      <BstTable table={table} />
    </div>
  )
}

describe('grid over a DataSource (end-to-end)', () => {
  test('renders exactly the fetched page in manual mode', async () => {
    render(<Grid src={createClientDataSource(seed)} />)
    await waitFor(() => expect(screen.getByTestId('total').textContent).toBe('5'))
    // page 0, size 2 → only 2 body rows rendered (server didn't hand us all 5)
    const bodyRows = document.querySelectorAll('.bst-table-tbody .bst-table-tr, tbody .bst-table-tr')
    expect(bodyRows.length).toBe(2)
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.queryByText('Bob')).toBeNull() // Bob is on page 1
  })
})
