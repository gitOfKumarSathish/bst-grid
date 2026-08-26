import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable, resolveActiveShortcuts, BST_SETTINGS_REGISTRY } from '../index'
import type { BstTableColumn, BstNoteSaveEvent } from '../index'

type Row = { id: string; name: string; qty: number }
const data: Row[] = [
  { id: '1', name: 'Al', qty: 5 },
  { id: '2', name: 'Bo', qty: 9 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
]

function Grid(opts: Record<string, unknown>) {
  const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id, ...opts })
  return <BstTable table={table} />
}

describe('Cell notes / comments (enableNotes)', () => {
  test('off by default — no note markers rendered and no note actions in context menu', () => {
    const { container } = render(<Grid enableContextMenu />)
    expect(container.querySelector('.bst-cell-note-marker')).toBeNull()
    const cell = container.querySelector('td[data-bst-rowid]') as HTMLElement
    fireEvent.contextMenu(cell)
    expect(screen.queryByText('Add note')).toBeNull()
    expect(screen.queryByText('Edit note')).toBeNull()
  })

  test('renders note marker on cells with notes when enableNotes is true', () => {
    const notes = {
      '1::name': 'Check inventory later',
    }
    const { container } = render(<Grid enableNotes notes={notes} />)
    const marker = container.querySelector('.bst-cell-note-marker')
    expect(marker).toBeTruthy()
    const notedCell = container.querySelector('td[data-has-note]')
    expect(notedCell).toBeTruthy()
    expect(notedCell?.getAttribute('data-bst-colid')).toBe('name')
  })

  test('hovering over a cell with a note displays the note popover preview', () => {
    const notes = {
      '1::name': 'Important client',
    }
    const { container } = render(<Grid enableNotes notes={notes} />)
    const notedCell = container.querySelector('td[data-has-note]') as HTMLElement
    expect(notedCell).toBeTruthy()

    fireEvent.mouseOver(notedCell)
    expect(screen.getByText('Important client')).toBeTruthy()

    fireEvent.mouseLeave(container.querySelector('.bst-table-scroll') as HTMLElement)
    expect(screen.queryByText('Important client')).toBeNull()
  })

  test('context menu offers "Add note" on un-noted cells and "Edit note" / "Delete note" on noted cells', () => {
    const onNoteSave = vi.fn()
    const onNotesChange = vi.fn()
    const notes = {
      '1::name': 'Existing note',
    }
    const { container } = render(
      <Grid
        enableNotes
        enableContextMenu
        notes={notes}
        onNoteSave={onNoteSave}
        onNotesChange={onNotesChange}
      />,
    )

    // Right click noted cell (1::name)
    const notedCell = container.querySelector('td[data-bst-rowid="1"][data-bst-colid="name"]') as HTMLElement
    fireEvent.contextMenu(notedCell)
    expect(screen.getByText('Edit note')).toBeTruthy()
    expect(screen.getByText('Delete note')).toBeTruthy()

    // Delete note
    fireEvent.click(screen.getByText('Delete note'))
    expect(onNoteSave).toHaveBeenCalledWith({
      rowId: '1',
      columnId: 'name',
      note: undefined,
      prevNote: 'Existing note',
    })
    expect(onNotesChange).toHaveBeenCalled()

    // Right click un-noted cell (1::qty)
    const emptyCell = container.querySelector('td[data-bst-rowid="1"][data-bst-colid="qty"]') as HTMLElement
    fireEvent.contextMenu(emptyCell)
    expect(screen.getByText('Add note')).toBeTruthy()
  })

  test('Shift+F2 opens note editor and saves new note via Save button or Ctrl+Enter', () => {
    const onNoteSave = vi.fn()
    const onNotesChange = vi.fn()
    const { container } = render(
      <Grid
        enableNotes
        enableCellSelection
        onNoteSave={onNoteSave}
        onNotesChange={onNotesChange}
      />,
    )

    const cell = container.querySelector('td[data-bst-rowid="1"][data-bst-colid="name"]') as HTMLElement
    fireEvent.mouseDown(cell) // select cell

    const table = container.querySelector('table') as HTMLElement
    fireEvent.keyDown(table, { key: 'F2', shiftKey: true })

    // Note editor dialog opens
    expect(screen.getByRole('dialog', { name: /cell note/i })).toBeTruthy()
    const textarea = screen.getByPlaceholderText('Add a note…') as HTMLTextAreaElement
    fireEvent.change(textarea, { target: { value: 'New note content' } })

    // Save
    fireEvent.click(screen.getByText('Save'))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onNoteSave).toHaveBeenCalledWith({
      rowId: '1',
      columnId: 'name',
      note: 'New note content',
      prevNote: undefined,
    })
    expect(onNotesChange).toHaveBeenCalled()
  })

  test('column with meta.notesAllowed: false refuses notes', () => {
    const noNoteColumns: BstTableColumn<Row>[] = [
      { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', notesAllowed: false } },
      { id: 'qty', accessorKey: 'qty', header: 'Qty', meta: { type: 'number' } },
    ]
    const { container } = render(
      <Grid enableNotes enableContextMenu columns={noNoteColumns} />,
    )

    const cell = container.querySelector('td[data-bst-rowid="1"][data-bst-colid="name"]') as HTMLElement
    fireEvent.contextMenu(cell)
    expect(screen.queryByText('Add note')).toBeNull()
  })

  test('registry: Shift+F2 shortcut is registered and settings sheet includes enableNotes', () => {
    const shortcuts = resolveActiveShortcuts({ enableNotes: true, enableCellSelection: true })
    const editGroup = shortcuts.find((g) => g.category === 'Edit')
    expect(editGroup?.items.some((it) => it.label.includes('cell note'))).toBe(true)

    const entry = BST_SETTINGS_REGISTRY.find((e) => e.key === 'enableNotes')
    expect(entry).toBeDefined()
    expect(entry?.group).toBe('Selection & clipboard')
  })
})
