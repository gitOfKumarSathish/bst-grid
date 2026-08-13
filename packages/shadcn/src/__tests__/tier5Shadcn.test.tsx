// Regression tests for the Tier-5 shadcn a11y/UX fixes (AUDIT_FIXES.md):
//   #20 — the settings slide-over traps focus and restores it on close
//   #16 — the Columns menu stays available for pin/group/reorder when hiding is off
import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import * as React from 'react'
import { BstTableShadcn } from '../index'
import type { BstTableColumn } from '@bloomskill/table-engine'

// Radix menus poke pointer-capture / scrollIntoView APIs jsdom lacks.
beforeEach(() => {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {}
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
})

type Row = { id: string; name: string; age: number | null }
const seed: Row[] = [
  { id: '1', name: 'Ada', age: 36 },
  { id: '2', name: 'Bo', age: 40 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number' } },
]

describe('#20 settings sheet focus management (shadcn)', () => {
  test('opening moves focus into the sheet; Escape restores it to the opener', async () => {
    render(
      <BstTableShadcn<Row> data={seed} columns={columns} getRowId={(r) => r.id} showSettings />,
    )
    const openBtn = screen.getByRole('button', { name: 'Table settings' })
    openBtn.focus()
    fireEvent.click(openBtn)

    // Focus entered the dialog (previously it stayed on the page behind).
    const sheet = screen.getByRole('dialog', { name: 'Table settings' })
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true))

    // Escape closes and focus returns to the button that opened it.
    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(document.activeElement).toBe(openBtn))
  })
})

describe('#16 columns menu stays available for pin/group when hiding is off (shadcn)', () => {
  test('pinning on + hiding off → the Columns menu is still rendered', () => {
    render(
      <BstTableShadcn<Row>
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableColumnPinning
        enableHiding={false}
      />,
    )
    expect(screen.getByRole('button', { name: /Columns/ })).toBeTruthy()
  })

  test('grouping on + hiding off → the Columns menu is still rendered', () => {
    render(
      <BstTableShadcn<Row>
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableGrouping
        enableHiding={false}
      />,
    )
    expect(screen.getByRole('button', { name: /Columns/ })).toBeTruthy()
  })

  test('nothing to host (no hiding, pin, order or group) → the Columns menu is hidden', () => {
    render(
      <BstTableShadcn<Row>
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableHiding={false}
      />,
    )
    expect(screen.queryByRole('button', { name: /Columns/ })).toBeNull()
  })
})
