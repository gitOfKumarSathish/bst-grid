import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  createCellTypeRegistry,
  defineCellType,
} from '../index'
import type { BstTableColumn, BstCellEdit } from '../index'

type Person = {
  id: string
  name: string
  age: number | null
  active: boolean
  role: string | null
}

const seed: Person[] = [
  { id: '1', name: 'Charlie', age: 30, active: true, role: 'admin' },
  { id: '2', name: 'Alice', age: 25, active: false, role: 'user' },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  {
    id: 'age',
    accessorKey: 'age',
    header: 'Age',
    meta: { type: 'number', editable: true, cellMeta: { required: true } },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean', editable: true } },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Role',
    meta: {
      type: 'singleSelect',
      editable: true,
      options: [
        { value: 'admin', label: 'Admin', color: '#ef4444' },
        { value: 'user', label: 'User' },
      ],
    },
  },
  {
    id: 'actions',
    header: '',
    meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } },
  },
]

function Grid(props: { onData?: (d: Person[]) => void }) {
  const [data, setData] = React.useState<Person[]>(seed)
  const table = useBstTable<Person>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: true,
    enableValidation: true,
    enableRowActions: true,
    onDataChange: (next) => {
      setData(next)
      props.onData?.(next)
    },
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Person[]
const dataRows = () => screen.getAllByRole('row').slice(1)

describe('registry read path (B-series)', () => {
  test('renders text, number, boolean and single-select read cells', () => {
    render(<Grid />)
    const row1 = dataRows()[0]
    expect(within(row1).getByText('Charlie')).toBeInTheDocument()
    expect(within(row1).getByText('30')).toBeInTheDocument()
    expect(within(row1).getByLabelText('yes')).toBeInTheDocument() // active=true (boolean cell)
    expect(within(row1).getByText('Admin')).toBeInTheDocument() // singleSelect label
  })
})

describe('inline editing round-trip', () => {
  test('double-click → edit → Enter commits by rowId', () => {
    render(<Grid />)
    const nameCell = within(dataRows()[0]).getByText('Charlie')
    fireEvent.doubleClick(nameCell)
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dataJson()[0].name).toBe('Charlotte')
    // back to read mode
    expect(within(dataRows()[0]).getByText('Charlotte')).toBeInTheDocument()
  })

  test('Escape cancels without persisting', () => {
    render(<Grid />)
    const nameCell = within(dataRows()[0]).getByText('Charlie')
    fireEvent.doubleClick(nameCell)
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Nope' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(dataJson()[0].name).toBe('Charlie')
  })

  test('boolean editor toggles and commits', () => {
    render(<Grid />)
    // row 2 active=false → shows —
    const cell = within(dataRows()[1]).getByText('—')
    fireEvent.doubleClick(cell)
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(dataJson()[1].active).toBe(true)
  })
})

describe('per-cell commit hook (onCellCommit / enableEditLog)', () => {
  function CommitGrid(props: {
    onCellCommit?: (c: BstCellEdit<Person>) => void
    enableEditLog?: boolean
  }) {
    const [data, setData] = React.useState<Person[]>(seed)
    const table = useBstTable<Person>({
      data,
      columns,
      getRowId: (r) => r.id,
      enableEditing: true,
      onDataChange: setData,
      onCellCommit: props.onCellCommit,
      enableEditLog: props.enableEditLog,
    })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  const editName = (to: string) => {
    const nameCell = within(screen.getAllByRole('row')[1]).getByText('Charlie')
    fireEvent.doubleClick(nameCell)
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: to } })
    fireEvent.keyDown(input, { key: 'Enter' })
  }

  test('onCellCommit fires once with the old → new delta on commit', () => {
    const calls: BstCellEdit<Person>[] = []
    render(<CommitGrid onCellCommit={(c) => calls.push(c)} />)
    editName('Charlotte')
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({
      rowId: '1',
      columnId: 'name',
      field: 'name',
      oldValue: 'Charlie',
      newValue: 'Charlotte',
      oldText: 'Charlie',
      newText: 'Charlotte',
    })
  })

  test('enableEditLog console.logs the commit when no handler is set', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    try {
      render(<CommitGrid enableEditLog />)
      editName('Chuck')
      expect(spy).toHaveBeenCalledWith(
        '[bst-table] cell commit',
        expect.objectContaining({ rowId: '1', columnId: 'name', newValue: 'Chuck' }),
      )
    } finally {
      spy.mockRestore()
    }
  })

  test('handler wins: enableEditLog stays quiet when onCellCommit is set', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const calls: BstCellEdit<Person>[] = []
    try {
      render(<CommitGrid enableEditLog onCellCommit={(c) => calls.push(c)} />)
      editName('Chaz')
      expect(calls).toHaveLength(1)
      expect(spy).not.toHaveBeenCalledWith('[bst-table] cell commit', expect.anything())
    } finally {
      spy.mockRestore()
    }
  })
})

describe('validation feedback', () => {
  test('required error blocks commit and shows message (blockCommitOnError)', () => {
    render(<Grid />)
    const ageCell = within(dataRows()[0]).getByText('30')
    fireEvent.doubleClick(ageCell)
    const input = screen.getByDisplayValue('30') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // not persisted
    expect(dataJson()[0].age).toBe(30)
    // error surfaced
    expect(screen.getByText('Required')).toBeInTheDocument()
  })
})

describe('row lifecycle via action column', () => {
  test('Delete removes the row', () => {
    render(<Grid />)
    fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Delete' }))
    const d = dataJson()
    expect(d.map((r) => r.id)).toEqual(['2'])
  })

  test('Copy duplicates the row with a temp id', () => {
    render(<Grid />)
    fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Copy' }))
    const d = dataJson()
    expect(d).toHaveLength(3)
    expect(d[1].id).toMatch(/^tmp_/)
    expect(d[1].name).toBe('Charlie')
  })

  test('row-session edit: Edit → change → Save persists', async () => {
    render(<Grid />)
    fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Edit' }))
    // row session → editable cells now show inputs; edit the name
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Chuck' } })
    fireEvent.keyDown(input, { key: 'Enter' }) // defer draft into the session
    fireEvent.click(within(dataRows()[0]).getByRole('button', { name: 'Save' }))
    // commitRowSession awaits (async) validation before persisting.
    await waitFor(() => expect(dataJson()[0].name).toBe('Chuck'))
  })
})

// An editor whose overlay (menu/popover) portals OUTSIDE the cell blurs the
// trigger the moment it opens. The default commit-on-blur would tear the editor
// down before the user picks a value (the MUI Select "can't select" bug). Cell
// types flagged `overlayEditor` opt out of that blur-commit and self-commit.
describe('overlayEditor — portalled-menu editors survive blur', () => {
  const overlaySelect = defineCellType<string | null>({
    id: 'overlaySelect',
    overlayEditor: true,
    renderRead: ({ value }) => <span>{String(value ?? '')}</span>,
    renderEdit: ({ draft, setDraft }) => (
      <input
        data-testid="ov-input"
        value={String(draft ?? '')}
        onChange={(e) => setDraft(e.target.value)}
      />
    ),
  })
  const plainSelect = defineCellType<string | null>({
    id: 'plainSelect',
    renderRead: ({ value }) => <span>{String(value ?? '')}</span>,
    renderEdit: ({ draft, setDraft }) => (
      <input
        data-testid="pl-input"
        value={String(draft ?? '')}
        onChange={(e) => setDraft(e.target.value)}
      />
    ),
  })

  function OverlayGrid() {
    const [data, setData] = React.useState([{ id: '1', a: 'x', b: 'y' }])
    const registry = React.useMemo(
      () => createCellTypeRegistry([overlaySelect, plainSelect]),
      [],
    )
    const table = useBstTable<{ id: string; a: string; b: string }>({
      data,
      columns: [
        { id: 'a', accessorKey: 'a', header: 'A', meta: { type: 'overlaySelect', editable: true } },
        { id: 'b', accessorKey: 'b', header: 'B', meta: { type: 'plainSelect', editable: true } },
      ],
      getRowId: (r) => r.id,
      enableEditing: true,
      cellTypes: registry,
      onDataChange: setData,
    })
    return (
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    )
  }

  test('overlayEditor cell keeps its editor open when focus leaves (menu opened)', () => {
    render(<OverlayGrid />)
    fireEvent.doubleClick(screen.getByText('x'))
    const input = screen.getByTestId('ov-input')
    // Focus jumps to the portalled menu (outside the cell). Must NOT commit.
    fireEvent.blur(input, { relatedTarget: document.body })
    expect(screen.getByTestId('ov-input')).toBeInTheDocument()
  })

  test('a normal editor still commits + closes on blur (unchanged baseline)', () => {
    render(<OverlayGrid />)
    fireEvent.doubleClick(screen.getByText('y'))
    const input = screen.getByTestId('pl-input')
    fireEvent.blur(input, { relatedTarget: document.body })
    expect(screen.queryByTestId('pl-input')).toBeNull()
  })
})
