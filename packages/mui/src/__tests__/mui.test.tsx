import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'
import * as React from 'react'
import { BstTableMui, createMuiPreset } from '../index'
import type { BstTableColumn } from '@bloomskill/table-engine'

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
      <BstTableMui<Person>
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
const bodyRows = () =>
  screen.getAllByRole('row').filter((r) => within(r).queryByText('Name') == null).slice(0)

describe('@bloomskill/table-mui — editing preset', () => {
  test('renders toolbar chrome (Add row) + read cells', () => {
    render(<Grid />)
    expect(screen.getByRole('button', { name: /Add row/i })).toBeInTheDocument()
    expect(screen.getByText('Charlie')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  test('MUI text editor commits on Enter', () => {
    render(<Grid />)
    fireEvent.doubleClick(screen.getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(dataJson()[0].name).toBe('Charlotte')
  })

  test('Add row appends a temp-id row', () => {
    render(<Grid />)
    const before = dataJson().length
    fireEvent.click(screen.getByRole('button', { name: /Add row/i }))
    const after = dataJson()
    expect(after).toHaveLength(before + 1)
    expect(after[after.length - 1].id).toMatch(/^tmp_/)
  })
})

// `hidden: true` because MUI's open Menu marks the rest of the document
// aria-hidden — the headers are still there, just not in the a11y tree.
const headerLabels = () =>
  screen
    .getAllByRole('columnheader', { hidden: true })
    .map((h) => (h.textContent || '').replace(/[↕▲▼]/g, '').trim())

describe('@bloomskill/table-mui — layout chrome (Phase 3)', () => {
  test('density toggle sets data-bst-density on the grid root', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} showDensityToggle />)
    const root = document.querySelector('.bst-table-root') as HTMLElement
    expect(root).not.toHaveAttribute('data-bst-density') // 'normal' → absent
    // density now lives in the "⋯ More" overflow menu
    fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /density/i }))
    expect(root).toHaveAttribute('data-bst-density', 'compact')
  })

  test('column menu pins a column (sticky)', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} enableColumnPinning />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Pin Name' }))
    const pinned = document.querySelector('th.bst-pinned-left')
    expect(pinned).toBeTruthy()
    expect(pinned?.textContent).toContain('Name')
  })

  test('column menu reorders columns (move left)', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} enableColumnOrdering />)
    expect(headerLabels()).toEqual(['Name', 'Age', 'Role'])
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Move Age left' }))
    expect(headerLabels()).toEqual(['Age', 'Name', 'Role'])
  })

  test('column menu "Copy column" copies the whole column (H3)', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} enableClipboard />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy Name column' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Charlie\nAlice'))
  })

  test('no "Copy column" button unless enableClipboard', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    expect(screen.queryByRole('button', { name: 'Copy Name column' })).toBeNull()
  })

  test('column menu edit toggle locks/unlocks a column (showColumnEditToggle)', () => {
    render(
      <BstTableMui
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        showColumnEditToggle
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    // Name is editable → the toggle offers to LOCK it.
    fireEvent.click(screen.getByRole('button', { name: 'Lock Name editing' }))
    // …and flips to offer UNLOCK (proves the override + reactive state).
    expect(screen.getByRole('button', { name: 'Allow Name editing' })).toBeInTheDocument()
  })

  test('no edit toggle without showColumnEditToggle', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} enableEditing />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    expect(screen.queryByRole('button', { name: /Lock .* editing/ })).toBeNull()
  })

  test('filter-builder button toggles a working panel', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} showFilterBuilder />)
    expect(screen.queryByRole('button', { name: '+ Add filter' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Filters/i }))
    fireEvent.click(screen.getByRole('button', { name: '+ Add filter' }))
    fireEvent.change(screen.getByLabelText('Filter value'), { target: { value: 'Charlie' } })
    expect(document.querySelectorAll('tr.bst-table-tr')).toHaveLength(1)
  })

  test('format-builder button opens/closes a working rule panel (K3)', () => {
    const { container } = render(
      <BstTableMui
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showFormatBuilder
        conditionalFormats={[
          { columnId: 'name', when: { op: 'equals', value: 'Charlie' }, className: 'cf-t' },
        ]}
      />,
    )
    // seeded rule is applied and counted on the button
    expect(container.querySelector('.cf-t')).toBeTruthy()
    // Formats now lives in the "⋯ More" overflow menu
    const openMore = () => fireEvent.click(screen.getByRole('button', { name: /more options/i }))
    openMore()
    fireEvent.click(screen.getByRole('menuitem', { name: /Formats \(1\)/ }))
    // panel opens (menu closes on select); add a rule → count bumps (uncontrolled)
    fireEvent.click(screen.getByRole('button', { name: '+ Add rule' }))
    openMore()
    const two = screen.getByRole('menuitem', { name: /Formats \(2\)/ })
    expect(two).toBeInTheDocument()
    // close the overflow menu (Esc), then close the panel via its X
    fireEvent.keyDown(two, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Close conditional formatting' }))
    expect(screen.queryByRole('button', { name: '+ Add rule' })).toBeNull()
  })

  test('format-builder chrome hides when enableConditionalFormatting is off', () => {
    render(
      <BstTableMui
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

describe('@bloomskill/table-mui — settings sheet', () => {
  beforeEach(() => window.localStorage.clear())

  test('gear opens a Drawer that lists provisioned features', () => {
    render(
      <BstTableMui
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showSettings={{ persist: false }}
        enableClipboard
      />,
    )
    // no drawer switches until opened
    expect(screen.queryByRole('switch', { name: 'Copy & paste' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    // provisioned opt-in + an always-on feature both appear as switches
    expect(screen.getByRole('switch', { name: 'Copy & paste' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Sorting' })).toBeChecked()
    // un-provisioned opt-in is absent
    expect(screen.queryByRole('switch', { name: 'Row selection' })).toBeNull()
  })

  test('disabling "Global search" in settings removes the search box', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} showSettings />)
    expect(screen.getByPlaceholderText('Search…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    fireEvent.click(screen.getByRole('switch', { name: 'Global search' }))
    expect(screen.queryByPlaceholderText('Search…')).toBeNull()
  })

  test('a custom title labels the gear + drawer', () => {
    render(
      <BstTableMui
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        showSettings={{ title: 'Customize', persist: false }}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Customize' }))
    expect(screen.getByRole('switch', { name: 'Sorting' })).toBeInTheDocument()
  })
})

describe('@bloomskill/table-mui — select editors are overlay editors', () => {
  // MUI's Select/menu portals to <body>. Without `overlayEditor`, opening it
  // blurs the cell and the engine commits + tears the editor down before you can
  // pick a value. Guard the flag so the "can't select" regression can't return.
  test('single- and multi-select cell types set overlayEditor', () => {
    const preset = createMuiPreset()
    expect(preset.get('singleSelect').overlayEditor).toBe(true)
    expect(preset.get('multiSelect').overlayEditor).toBe(true)
    // a plain text editor must NOT opt out of commit-on-blur
    expect(preset.get('text').overlayEditor).toBeFalsy()
  })
})

describe('@bloomskill/table-mui — copy-column button gating', () => {
  test('shows a per-column Copy button when clipboard + copy-column are on', () => {
    render(<BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} enableClipboard />)
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    expect(screen.getAllByRole('button', { name: /Copy .* column/i }).length).toBeGreaterThan(0)
  })

  test('hides the Copy-column button when enableCopyColumn={false}', () => {
    render(
      <BstTableMui
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableClipboard
        enableCopyColumn={false}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Columns/i }))
    expect(screen.queryByRole('button', { name: /Copy .* column/i })).toBeNull()
  })
})

describe('@bloomskill/table-mui — review-changes sheet (batch mode)', () => {
  function BatchGrid(props: { onSave?: (e: any) => void | Promise<void> }) {
    const [data, setData] = React.useState<Person[]>(seed)
    return (
      <>
        <BstTableMui<Person>
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

  test('batch edit shows the unsaved chip + Review & save instead of writing', () => {
    render(<BatchGrid />)
    editName('Charlie', 'Charlotte')
    expect(dataJson()[0].name).toBe('Charlie') // deferred, not persisted
    expect(screen.getByText('1 unsaved')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Review & save/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Save$/ })).toBeNull() // sheet replaces plain save
  })

  test('the sheet lists row, column and old → new, and reverts a single change', async () => {
    render(<BatchGrid />)
    editName('Charlie', 'Charlotte')
    fireEvent.click(screen.getByRole('button', { name: /Review & save/i }))
    const sheet = screen.getByRole('dialog', { name: 'Unsaved changes' })
    expect(within(sheet).getByText('Row 1')).toBeInTheDocument()
    expect(within(sheet).getByText('Name')).toBeInTheDocument()
    expect(within(sheet).getByText('Charlie')).toBeInTheDocument() // old value
    expect(within(sheet).getByText('Charlotte')).toBeInTheDocument() // new value

    fireEvent.click(within(sheet).getByRole('button', { name: 'Revert Name in row 1' }))
    // Last change reverted → sheet closes (Drawer animates out), grid shows the
    // original again.
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).toBeNull(),
    )
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
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Unsaved changes' })).toBeNull(),
    )
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

describe('@bloomskill/table-mui — Batch editing toggle in the settings sheet', () => {
  function SettingsBatchGrid() {
    const [data, setData] = React.useState<Person[]>(seed)
    return (
      <>
        <BstTableMui<Person>
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

  test('the sheet offers "Batch editing" ON for a { mode: batch } grid; switching it off makes edits commit per cell', async () => {
    render(<SettingsBatchGrid />)
    fireEvent.click(screen.getByRole('button', { name: 'Table settings' }))
    const sw = await screen.findByRole('switch', { name: 'Batch editing' })
    expect(sw).toBeChecked() // derived from enableEditing.mode === 'batch'

    fireEvent.click(sw) // end-user turns batch mode OFF
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    // MUI's Drawer animates out — wait for the modal to unmount before editing.
    await waitFor(() =>
      expect(screen.queryByRole('switch', { name: 'Batch editing' })).toBeNull(),
    )

    fireEvent.doubleClick(screen.getByText('Charlie'))
    const input = screen.getByDisplayValue('Charlie') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Charlotte' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // per-cell commit now — written straight through, no Review & save bar
    expect(dataJson()[0].name).toBe('Charlotte')
    expect(screen.queryByRole('button', { name: /Review & save/i })).toBeNull()
  })
})
