import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { BstTableShadcn } from '../index'
import type { BstTableColumn } from '@bloomskill/table-engine'

// Radix opens its Portal-rendered menu via pointer events + focuses items with
// scrollIntoView — neither is implemented in jsdom. Polyfill so the menu opens.
beforeEach(() => {
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
  if (!Element.prototype.hasPointerCapture)
    Element.prototype.hasPointerCapture = () => false
  if (!Element.prototype.setPointerCapture) Element.prototype.setPointerCapture = () => {}
  if (!Element.prototype.releasePointerCapture)
    Element.prototype.releasePointerCapture = () => {}
})

type Person = { id: string; name: string; age: number | null; role: string | null }

const seed: Person[] = [
  { id: '1', name: 'Charlie', age: 30, role: 'admin' },
  { id: '2', name: 'Alice', age: 25, role: 'user' },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } },
  {
    id: 'role',
    accessorKey: 'role',
    header: 'Role',
    meta: {
      type: 'singleSelect',
      editable: true,
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ],
    },
  },
]

function Grid() {
  const [data, setData] = React.useState<Person[]>(seed)
  return (
    <>
      <BstTableShadcn<Person>
        data={data}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        enableValidation
        enableRowActions
        onDataChange={setData}
      />
      <pre data-testid="data">{JSON.stringify(data)}</pre>
    </>
  )
}

const dataJson = () => JSON.parse(screen.getByTestId('data').textContent || '[]') as Person[]

describe('@bloomskill/table-shadcn — editing preset', () => {
  test('renders chrome + read cells', () => {
    render(<Grid />)
    expect(screen.getByRole('button', { name: /Add row/i })).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  test('native text editor commits on Enter', () => {
    render(<Grid />)
    fireEvent.doubleClick(screen.getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Chuck' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dataJson()[0].name).toBe('Chuck')
  })

  test('Add row appends a temp-id row', () => {
    render(<Grid />)
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }))
    const d = dataJson()
    expect(d).toHaveLength(3)
    expect(d[2].id).toMatch(/^tmp_/)
  })

  // MUI-parity (B7): the skin inherits the engine's checkbox-dropdown multiSelect
  // editor via ...defaultCellTypes — a popup with one checkbox per option that
  // commits on close, NOT the old native <select multiple> listbox.
  test('multiSelect edits through the checkbox-dropdown and commits on close', () => {
    const msColumns: BstTableColumn<Person & { skills: string[] }>[] = [
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
            { value: 'ts', label: 'TypeScript' },
            { value: 'node', label: 'Node' },
          ],
        },
      },
    ]
    function MsGrid() {
      const [data, setData] = React.useState([
        { id: '1', name: 'Ada', age: null, role: null, skills: ['react'] },
      ])
      return (
        <>
          <BstTableShadcn
            data={data}
            columns={msColumns}
            getRowId={(r) => r.id}
            enableEditing
            onDataChange={setData}
          />
          <pre data-testid="ms-data">{JSON.stringify(data)}</pre>
        </>
      )
    }
    render(<MsGrid />)
    fireEvent.doubleClick(screen.getByText('React'))
    const listbox = screen.getByRole('listbox')
    const boxes = within(listbox).getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    fireEvent.click(boxes[1]) // + ts
    fireEvent.mouseDown(document.body) // close → commit
    const d = JSON.parse(screen.getByTestId('ms-data').textContent || '[]')
    expect(d[0].skills).toEqual(['react', 'ts'])
  })
})

describe('@bloomskill/table-shadcn — columns menu (portaled)', () => {
  // Regression: the menu renders through a Radix Portal at <body>, outside
  // .sc-card, so it must carry its own theme so var(--sc-*) resolves (else the
  // background is transparent and the table bleeds through). The component half
  // of the fix is tagging the portaled content with `sc-dark` in dark mode; the
  // CSS half groups the --sc-* tokens onto `.sc-menu` too.
  test('menu opens outside .sc-card and carries the .sc-menu theme class', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} />,
    )
    await user.click(screen.getByRole('button', { name: /Columns/i }))
    const menu = await screen.findByRole('menu')
    expect(menu).toHaveClass('sc-menu')
    // It really is portaled out of the card (that's why it needs its own tokens).
    expect(container.querySelector('.sc-card')?.contains(menu)).toBe(false)
    // Light mode: no dark token class.
    expect(menu).not.toHaveClass('sc-dark')
  })

  test('dark mode tags the portaled menu with sc-dark so dark tokens apply', async () => {
    const user = userEvent.setup()
    render(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} dark />)
    await user.click(screen.getByRole('button', { name: /Columns/i }))
    const menu = await screen.findByRole('menu')
    expect(menu).toHaveClass('sc-menu', 'sc-dark')
  })

  test('"Copy column" in the menu copies the whole column (H3)', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} enableClipboard />)
    await user.click(screen.getByRole('button', { name: /Columns/i }))
    await screen.findByRole('menu')
    await user.click(screen.getByRole('button', { name: 'Copy Name column' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Charlie\nAlice'))
  })

  test('edit toggle in the menu locks/unlocks a column (showColumnEditToggle)', async () => {
    const user = userEvent.setup()
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        showColumnEditToggle
      />,
    )
    await user.click(screen.getByRole('button', { name: /Columns/i }))
    await screen.findByRole('menu')
    await user.click(screen.getByRole('button', { name: 'Lock Name editing' }))
    expect(
      await screen.findByRole('button', { name: 'Allow Name editing' }),
    ).toBeInTheDocument()
  })

  test('hide toggle in the menu hides/shows a column (enableHiding)', async () => {
    const user = userEvent.setup()
    render(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} />)
    expect(screen.getByRole('columnheader', { name: /Age/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Columns/i }))
    await screen.findByRole('menu')
    // Age is visible → the eye toggle offers to HIDE it.
    await user.click(screen.getByRole('button', { name: 'Hide Age' }))
    // The toggle flips to offer SHOW…
    expect(await screen.findByRole('button', { name: 'Show Age' })).toBeInTheDocument()
    // …and the column drops out of the header.
    expect(screen.queryByRole('columnheader', { name: /Age/i })).toBeNull()
  })
})

describe('@bloomskill/table-shadcn — settings sheet', () => {
  beforeEach(() => window.localStorage.clear())

  test('gear opens a right-side sheet listing provisioned features', () => {
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showSettings={{ persist: false }}
        enableClipboard
      />,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'Copy & paste' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Sorting' })).toBeChecked()
    expect(screen.queryByRole('switch', { name: 'Row selection' })).toBeNull()
  })

  test('disabling "Global search" in settings removes the search box', () => {
    render(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} showSettings />)
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Global search' }))
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
  })

  test('persists a choice to localStorage across remounts', () => {
    const props = {
      data: seed,
      columns,
      getRowId: (r: Person) => r.id,
      showSettings: { persistKey: 'sc-unit' } as const,
      enableClipboard: true,
    }
    const { unmount } = render(<BstTableShadcn {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Copy & paste' }))
    expect(window.localStorage.getItem('bst-table:settings:sc-unit')).toContain('enableClipboard')
    unmount()
    render(<BstTableShadcn {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    expect(screen.getByRole('switch', { name: 'Copy & paste' })).not.toBeChecked()
  })

  test('enabling "Sticky header" caps the body + pins the header via the engine class', () => {
    const { container } = render(
      <BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} showSettings={{ persist: false }} />,
    )
    const scroll = () => container.querySelector('.bst-table-scroll') as HTMLElement
    expect(scroll().classList.contains('bst-sticky-header')).toBe(false)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    const sw = screen.getByRole('switch', { name: 'Sticky header' })
    expect(sw).not.toBeChecked()
    fireEvent.click(sw)
    expect(scroll().classList.contains('bst-sticky-header')).toBe(true)
    expect(scroll().style.getPropertyValue('--bst-max-height')).toBe('440px')
  })
})

describe('@bloomskill/table-shadcn — "Rows per page" All option', () => {
  test('pageSizeOptions can include "all" to show every (filtered) row', () => {
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        pagination={{ pageSize: 1 }}
        pageSizeOptions={[1, 'all']}
      />,
    )
    // Page 1 shows a single row.
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).toBeNull()
    // The native select offers an "All" option; choosing it shows every row.
    const select = screen.getByRole('combobox') as HTMLSelectElement
    const allOption = within(select).getByRole('option', { name: 'All' }) as HTMLOptionElement
    fireEvent.change(select, { target: { value: allOption.value } })
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()
  })
})

describe('@bloomskill/table-shadcn — Save view / Reset view controls (X21)', () => {
  beforeEach(() => window.localStorage.clear())

  test('manual mode: the settings footer Save view writes the snapshot, Reset view clears it', () => {
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        gridState={{ key: 'unit-view', persist: false }}
        showSettings={{ persist: false }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    expect(window.localStorage.getItem('bst-table:state:unit-view')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Save view' }))
    expect(window.localStorage.getItem('bst-table:state:unit-view')).toContain('"version"')
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
    expect(window.localStorage.getItem('bst-table:state:unit-view')).toBeNull()
  })

  test('auto mode shows Reset view but not Save view (saving is automatic)', () => {
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        gridState={{ key: 'unit-view-auto' }}
        showSettings={{ persist: false }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    expect(screen.queryByRole('button', { name: 'Save view' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Reset view' })).toBeInTheDocument()
  })
})

describe('@bloomskill/table-shadcn — review-changes sheet (batch mode)', () => {
  function BatchGrid(props: { onSave?: (e: any) => void | Promise<void> }) {
    const [data, setData] = React.useState<Person[]>(seed)
    return (
      <>
        <BstTableShadcn<Person>
          data={data}
          columns={columns}
          getRowId={(r) => r.id}
          enableEditing={{ mode: 'batch' }}
          onDataChange={setData}
          onSave={props.onSave}
        />
        <pre data-testid="data">{JSON.stringify(data)}</pre>
      </>
    )
  }

  const editName = (from: string, to: string) => {
    fireEvent.doubleClick(screen.getByText(from))
    const input = screen.getByDisplayValue(from) as HTMLInputElement
    fireEvent.change(input, { target: { value: to } })
    fireEvent.keyDown(input, { key: 'Enter' })
  }

  test('batch edit shows the unsaved badge + Review & save instead of writing', () => {
    render(<BatchGrid />)
    editName('Charlie', 'Charlotte')
    expect(dataJson()[0].name).toBe('Charlie') // deferred, not persisted
    expect(screen.getByText('1 unsaved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review & save/i })).toBeInTheDocument()
  })

  test('the sheet lists row, column and old → new, and reverts a single change', () => {
    render(<BatchGrid />)
    editName('Charlie', 'Charlotte')
    fireEvent.click(screen.getByRole('button', { name: /Review & save/i }))
    const sheet = screen.getByRole('dialog', { name: 'Unsaved changes' })
    expect(within(sheet).getByText('Row 1')).toBeInTheDocument()
    expect(within(sheet).getByText('Name')).toBeInTheDocument()
    expect(within(sheet).getByText('Charlie')).toBeInTheDocument() // old value
    expect(within(sheet).getByText('Charlotte')).toBeInTheDocument() // new value

    fireEvent.click(within(sheet).getByRole('button', { name: 'Revert Name in row 1' }))
    // Last change reverted → sheet closes, grid shows the original again.
    expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).toBeNull()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(dataJson()[0].name).toBe('Charlie')
  })

  test('the sheet confirm saves the whole batch through ONE onSave call', async () => {
    const onSave = vi.fn(() => Promise.resolve())
    render(<BatchGrid onSave={onSave} />)
    editName('Charlie', 'Charlotte')
    editName('Alice', 'Alicia')
    fireEvent.click(screen.getByRole('button', { name: /Review & save/i }))
    const sheet = screen.getByRole('dialog', { name: 'Unsaved changes' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Save 2 changes/i }))
    await waitFor(() => expect(dataJson()[0].name).toBe('Charlotte'))
    expect(dataJson()[1].name).toBe('Alicia')
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0].changes).toHaveLength(2)
    expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).toBeNull()
  })

  test('a failed onSave keeps the drafts and reports the error in the sheet', async () => {
    const onSave = vi.fn(() => Promise.reject(new Error('API down')))
    render(<BatchGrid onSave={onSave} />)
    editName('Charlie', 'Charlotte')
    fireEvent.click(screen.getByRole('button', { name: /Review & save/i }))
    const sheet = screen.getByRole('dialog', { name: 'Unsaved changes' })
    fireEvent.click(within(sheet).getByRole('button', { name: /Save 1 change/i }))
    await waitFor(() =>
      expect(within(sheet).getByText(/Couldn’t save/)).toBeInTheDocument(),
    )
    expect(dataJson()[0].name).toBe('Charlie') // nothing written
    expect(within(sheet).getByText('Charlotte')).toBeInTheDocument() // draft still listed
  })
})

describe('@bloomskill/table-shadcn — Batch editing toggle in the settings sheet', () => {
  function SettingsBatchGrid() {
    const [data, setData] = React.useState<Person[]>(seed)
    return (
      <>
        <BstTableShadcn<Person>
          data={data}
          columns={columns}
          getRowId={(r) => r.id}
          enableEditing={{ mode: 'batch' }}
          onDataChange={setData}
          showSettings={{ persist: false }}
        />
        <pre data-testid="data">{JSON.stringify(data)}</pre>
      </>
    )
  }

  test('the sheet offers "Batch editing" ON for a { mode: batch } grid; switching it off makes edits commit per cell', () => {
    render(<SettingsBatchGrid />)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    const sw = screen.getByRole('switch', { name: 'Batch editing' })
    expect(sw).toBeChecked() // derived from enableEditing.mode === 'batch'

    fireEvent.click(sw) // end-user turns batch mode OFF
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))

    fireEvent.doubleClick(screen.getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // per-cell commit now — written straight through, no Review & save button
    expect(dataJson()[0].name).toBe('Charlotte')
    expect(screen.queryByRole('button', { name: /Review & save/i })).toBeNull()
  })
})

describe('@bloomskill/table-shadcn — conditional-format builder chrome (K3)', () => {
  test('Formats button opens the rule panel; adding a rule bumps the count; X closes it', () => {
    const { container } = render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showFormatBuilder
        conditionalFormats={[
          { columnId: 'name', when: { op: 'equals', value: 'Charlie' }, className: 'cf-t' },
        ]}
      />,
    )
    expect(container.querySelector('.cf-t')).toBeTruthy() // seeded rule applied
    // Formats is inline when the toolbar has room (responsive; jsdom = always inline)
    fireEvent.click(screen.getByRole('button', { name: /Formats \(1\)/ }))
    fireEvent.click(screen.getByRole('button', { name: '+ Add rule' }))
    expect(screen.getByRole('button', { name: /Formats \(2\)/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Close conditional formatting' }))
    expect(screen.queryByRole('button', { name: '+ Add rule' })).toBeNull()
  })

  test('chrome hides when enableConditionalFormatting is off', () => {
    render(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showFormatBuilder
        enableConditionalFormatting={false}
      />,
    )
    expect(screen.queryByRole('button', { name: /Formats/ })).toBeNull()
  })
})
