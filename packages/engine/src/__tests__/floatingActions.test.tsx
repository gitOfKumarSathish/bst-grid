import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, BST_SETTINGS_REGISTRY } from '../index'
import type { BstTableColumn } from '../index'

type Row = { id: string; name: string; age: number }
const data: Row[] = [
  { id: '1', name: 'Alice', age: 28 },
  { id: '2', name: 'Bob', age: 34 },
  { id: '3', name: 'Charlie', age: 42 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

function Grid(opts: Record<string, unknown>) {
  const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id, ...opts })
  return <BstTable table={table} />
}

describe('Floating Options & Visual Enhancements', () => {
  test('floating selection action bar appears when rows are selected', () => {
    const { container } = render(
      <Grid enableRowSelection enableFloatingActionBar enableRowActions enableExport />,
    )

    // Initially no floating action bar
    expect(screen.queryByRole('toolbar', { name: /selected rows actions/i })).toBeNull()

    // Select row 1
    const checkbox = container.querySelectorAll('.bst-checkbox')[1] as HTMLInputElement
    fireEvent.click(checkbox)

    // Floating bar appears
    const bar = screen.getByRole('toolbar', { name: /selected rows actions/i })
    expect(bar).toBeTruthy()
    expect(screen.getByText('1 selected')).toBeTruthy()
    expect(screen.getByRole('button', { name: /copy/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /export/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy()

    // Clicking Deselect clears the bar
    fireEvent.click(screen.getByRole('button', { name: /deselect/i }))
    expect(screen.queryByRole('toolbar', { name: /selected rows actions/i })).toBeNull()
  })

  test('custom renderFloatingActions receives selected rows context', () => {
    const renderFloatingActions = vi.fn((ctx) => (
      <div data-testid="custom-floating">
        Custom {ctx.count} rows selected
      </div>
    ))

    const { container } = render(
      <Grid
        enableRowSelection
        enableFloatingActionBar
        renderFloatingActions={renderFloatingActions}
      />,
    )

    const checkbox = container.querySelectorAll('.bst-checkbox')[1] as HTMLInputElement
    fireEvent.click(checkbox)

    expect(screen.getByTestId('custom-floating').textContent).toContain('Custom 1 rows selected')
    expect(renderFloatingActions).toHaveBeenCalled()
  })

  test('floating row quick actions render when enableFloatingRowActions is active', () => {
    const { container } = render(
      <Grid enableFloatingRowActions enableRowActions enableNotes />,
    )

    const rowActions = container.querySelectorAll('.bst-row-floating-actions')
    expect(rowActions.length).toBe(3) // one per row
  })

  test('header carries .bst-th-filtered when column has an active filter', () => {
    const { container } = render(
      <Grid
        enableColumnFilters
        initialState={{ columnFilters: [{ id: 'name', value: 'Alice' }] }}
      />,
    )

    const nameTh = container.querySelector('.bst-table-th.bst-th-filtered')
    expect(nameTh).toBeTruthy()
  })

  test('master-detail row expansion applies .bst-row-expanded with accent styles', () => {
    const { container } = render(
      <Grid
        enableExpanding
        renderDetail={(r: Row) => <div>Detail for {r.name}</div>}
      />,
    )

    const expandBtn = container.querySelectorAll('.bst-expander-btn')[0] as HTMLButtonElement
    fireEvent.click(expandBtn)

    const expandedTr = container.querySelector('tr.bst-row-expanded')
    expect(expandedTr).toBeTruthy()
    const detailTd = container.querySelector('td.bst-detail-td')
    expect(detailTd).toBeTruthy()
  })

  test('settings registry includes enableFloatingActionBar and enableFloatingRowActions', () => {
    const barEntry = BST_SETTINGS_REGISTRY.find((e) => e.key === 'enableFloatingActionBar')
    expect(barEntry).toBeDefined()
    expect(barEntry?.group).toBe('Selection & clipboard')

    const rowEntry = BST_SETTINGS_REGISTRY.find((e) => e.key === 'enableFloatingRowActions')
    expect(rowEntry).toBeDefined()
    expect(rowEntry?.group).toBe('Editing')
  })
})
