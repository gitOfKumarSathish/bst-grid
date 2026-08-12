import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import * as React from 'react'
import { useBstTable, BstTable } from '../index'
import type { BstTableColumn } from '../index'

type Person = { id: string; name: string; skills: string[] }

const seed: Person[] = [
  { id: '1', name: 'Ada', skills: ['react', 'ts'] },
  { id: '2', name: 'Bo', skills: [] },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  {
    id: 'skills',
    accessorKey: 'skills',
    header: 'Skills',
    meta: {
      type: 'multiSelect',
      editable: true,
      options: [
        { value: 'react', label: 'React' },
        { value: 'ts', label: 'TypeScript', color: '#3178c6' },
        { value: 'node', label: 'Node' },
        { value: 'css', label: 'CSS' },
      ],
    },
  },
]

function Grid() {
  const [data, setData] = React.useState<Person[]>(seed)
  const table = useBstTable<Person>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: true,
    onDataChange: setData,
  })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </div>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Person[]
const skillsCell = () =>
  within(screen.getAllByRole('row')[1]).getAllByRole('cell')[1] as HTMLElement

// The neutral multiSelect editor (B7) — a checkbox-dropdown, not a native
// <select multiple> listbox. This is what the shadcn skin inherits, so it is
// the MUI-parity contract: popup opens on edit, toggles accumulate in the
// draft, closing the popup commits, Escape cancels.
describe('multiSelect checkbox-dropdown editor', () => {
  test('double-click opens the checkbox popup with current values checked', () => {
    render(<Grid />)
    fireEvent.doubleClick(skillsCell())

    // trigger shows the current selection as labels
    const trigger = screen.getByRole('button', { name: /React, TypeScript/ })
    expect(trigger).toHaveAttribute('aria-expanded', 'true')

    // popup opened automatically (single-cell edit), one checkbox per option
    const listbox = screen.getByRole('listbox')
    const boxes = within(listbox).getAllByRole('checkbox')
    expect(boxes).toHaveLength(4)
    expect((boxes[0] as HTMLInputElement).checked).toBe(true) // react
    expect((boxes[1] as HTMLInputElement).checked).toBe(true) // ts
    expect((boxes[2] as HTMLInputElement).checked).toBe(false) // node
  })

  test('toggling keeps the popup open; closing it commits the accumulated draft', () => {
    render(<Grid />)
    fireEvent.doubleClick(skillsCell())
    const listbox = screen.getByRole('listbox')
    const boxes = within(listbox).getAllByRole('checkbox')

    fireEvent.click(boxes[2]) // + node
    fireEvent.click(boxes[0]) // - react
    // still editing — nothing persisted yet, popup still open
    expect(dataJson()[0].skills).toEqual(['react', 'ts'])
    expect(screen.getByRole('listbox')).toBeInTheDocument()

    // outside mousedown closes the popup and commits
    fireEvent.mouseDown(document.body)
    expect(dataJson()[0].skills).toEqual(['ts', 'node'])
    // back to read mode: chips render the committed values
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(within(skillsCell()).getByText('Node')).toBeInTheDocument()
  })

  test('Escape cancels without persisting', () => {
    render(<Grid />)
    fireEvent.doubleClick(skillsCell())
    const boxes = within(screen.getByRole('listbox')).getAllByRole('checkbox')
    fireEvent.click(boxes[3]) // + css
    fireEvent.keyDown(boxes[3], { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(dataJson()[0].skills).toEqual(['react', 'ts'])
  })

  test('empty value shows a muted placeholder on the trigger', () => {
    render(<Grid />)
    const cell = within(screen.getAllByRole('row')[2]).getAllByRole('cell')[1]
    fireEvent.doubleClick(cell)
    expect(screen.getByRole('button', { name: '—' })).toBeInTheDocument()
  })
})
