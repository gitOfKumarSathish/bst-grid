// Runs INSIDE a throwaway project that installed @bloomskill/* from packed tarballs —
// nothing here imports workspace source. If this passes, the packages are
// genuinely portable to any external app.
import { describe, test, expect } from 'vitest'
import { render, fireEvent, within, screen } from '@testing-library/react'
import * as React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { BstTableMui } from '@bloomskill/table-mui'
import { BstTableShadcn } from '@bloomskill/table-shadcn'
import type { BstTableColumn } from '@bloomskill/table-engine'

type Row = { id: string; name: string; age: number }
const data: Row[] = [
  { id: '1', name: 'Charlie', age: 30 },
  { id: '2', name: 'Alice', age: 25 },
  { id: '3', name: 'Bob', age: 40 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'basic' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

const names = (c: HTMLElement) =>
  Array.from(c.querySelectorAll('tbody .bst-table-tr .bst-table-td:first-child')).map(
    (e) => e.textContent,
  )

describe('portability: packaged @bloomskill/* work in a foreign project', () => {
  test('@bloomskill/table-mui renders + sorts', () => {
    const u = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui data={data} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 10 }} />
      </ThemeProvider>,
    )
    expect(names(u.container)).toEqual(['Charlie', 'Alice', 'Bob'])
    fireEvent.click(u.getByText('Name'))
    expect(names(u.container)).toEqual(['Alice', 'Bob', 'Charlie'])
  })

  test('@bloomskill/table-shadcn renders all rows', () => {
    const u = render(
      <BstTableShadcn data={data} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 10 }} />,
    )
    expect(u.container.querySelectorAll('tbody .bst-table-tr').length).toBe(3)
  })

  test('Phase 2: @bloomskill/table-mui inline editing persists by rowId', () => {
    const editCols: BstTableColumn<Row>[] = [
      { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
      { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } },
    ]
    function Grid() {
      const [d, setD] = React.useState<Row[]>(data)
      return (
        <ThemeProvider theme={createTheme()}>
          <BstTableMui
            data={d}
            columns={editCols}
            getRowId={(r) => r.id}
            enableEditing
            enableRowActions
            onDataChange={setD}
            pagination={{ pageSize: 10 }}
          />
          <pre data-testid="d">{JSON.stringify(d)}</pre>
        </ThemeProvider>
      )
    }
    render(<Grid />)
    fireEvent.doubleClick(screen.getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    const d = JSON.parse(screen.getByTestId('d').textContent || '[]') as Row[]
    expect(d[0].name).toBe('Charlotte')
    // Add row chrome exposed by the adapter (getByRole throws if absent)
    expect(screen.getByRole('button', { name: /Add row/i })).toBeTruthy()
  })
})
