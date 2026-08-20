/// <reference types="@testing-library/jest-dom/vitest" />
import { describe, test, expect, afterEach } from 'vitest'
import { render, cleanup, fireEvent, within, waitFor } from '@testing-library/react'
import * as React from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useBstDataSource, createClientDataSource } from '@bloomskill/table-engine'
import { BstTableMui } from '@bloomskill/table-mui'
import { BstTableShadcn } from '@bloomskill/table-shadcn'
import {
  people, columns, dbTables, dbTableColumns, dbFieldColumns,
  serverPeople, serverColumns, erpVendors, erpColumns,
  type DbTable, type DbField, type Person, type ErpVendor,
} from './data'

afterEach(cleanup)

const bodyRowCount = (c: HTMLElement) =>
  c.querySelectorAll('tbody .bst-table-tr').length

const firstCellText = (c: HTMLElement) =>
  c.querySelector('tbody .bst-table-tr .bst-table-td')?.textContent ?? ''

/** Same behavioural contract, asserted through each skin. */
function runOOTBContract(getContainer: () => HTMLElement, utils: any) {
  // pagination: pageSize=5 → 5 body rows
  expect(bodyRowCount(getContainer())).toBe(5)
  const firstBefore = firstCellText(getContainer())

  // next page advances the window
  fireEvent.click(utils.getByLabelText('Next page'))
  expect(firstCellText(getContainer())).not.toBe(firstBefore)

  // global search filters rows; clearing restores them
  const search = utils.getByPlaceholderText('Search…')
  fireEvent.change(search, { target: { value: 'zzzz-no-match' } })
  expect(bodyRowCount(getContainer())).toBe(0)
  fireEvent.change(search, { target: { value: '' } })
  expect(bodyRowCount(getContainer())).toBe(5)
}

describe('OOTB features work identically through both style adapters', () => {
  test('MUI adapter: search + pagination', () => {
    const utils = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui data={people} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 5 }} />
      </ThemeProvider>,
    )
    runOOTBContract(() => utils.container, utils)
  })

  test('shadcn/Radix adapter: search + pagination', () => {
    const utils = render(
      <BstTableShadcn data={people} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 5 }} />,
    )
    runOOTBContract(() => utils.container, utils)
  })

  test('showSearch={false} hides the search box in both skins', () => {
    const m = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui data={people} columns={columns} getRowId={(r) => r.id} showSearch={false} />
      </ThemeProvider>,
    )
    expect(m.queryByPlaceholderText('Search…')).toBeNull()
    cleanup()

    const s = render(
      <BstTableShadcn data={people} columns={columns} getRowId={(r) => r.id} showSearch={false} />,
    )
    expect(s.queryByPlaceholderText('Search…')).toBeNull()
  })

  test('engine toggle pagination={false} shows all rows and hides the bar', () => {
    const u = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui data={people} columns={columns} getRowId={(r) => r.id} pagination={false} />
      </ThemeProvider>,
    )
    expect(u.container.querySelectorAll('tbody .bst-table-tr').length).toBe(people.length)
    expect(u.queryByLabelText('Next page')).toBeNull()
  })

  test('master-detail (A4): renderDetail hosts a full NESTED table with its own header + values', () => {
    const detail = (t: DbTable) => (
      <BstTableMui<DbField>
        data={t.fields}
        columns={dbFieldColumns}
        getRowId={(f) => f.id}
        showToolbar={false}
        pagination={false}
      />
    )
    const u = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui<DbTable>
          data={dbTables}
          columns={dbTableColumns}
          getRowId={(r) => r.id}
          enableExpanding
          renderDetail={detail}
          initialState={{ expanded: { users: true } }}
          pagination={false}
          showToolbar={false}
        />
      </ThemeProvider>,
    )
    // The pre-expanded "users" row hosts a detail panel…
    const detailTd = u.container.querySelector('.bst-detail-td') as HTMLElement
    expect(detailTd).not.toBeNull()
    // …containing a REAL nested table: its own <thead> header cells…
    const nested = within(detailTd)
    expect(nested.getByRole('table')).toBeTruthy()
    for (const h of ['Column', 'Type', 'Nullable', 'Default', 'PK']) {
      expect(nested.getByText(h)).toBeTruthy()
    }
    // …and its own value rows (the users table's field metadata).
    expect(nested.getByText('email')).toBeTruthy()
    expect(nested.getByText('varchar(255)')).toBeTruthy()
    expect(detailTd.querySelectorAll('tbody .bst-table-tr').length).toBe(
      dbTables[0].fields.length,
    )
    // The inner header must be the nested table's own — the OUTER header has no "Column".
    const outerHead = u.container.querySelector('thead') as HTMLElement
    expect(within(outerHead).queryByText('Column')).toBeNull()

    // Expanding a second row spins up an independent nested instance.
    const ordersRow = u.getByText('orders').closest('tr') as HTMLElement
    fireEvent.click(within(ordersRow).getByRole('button'))
    const panels = u.container.querySelectorAll('.bst-detail-td')
    expect(panels.length).toBe(2)
    expect(within(panels[1] as HTMLElement).getByText('order_status')).toBeTruthy()
  })

  test('chrome toggles showColumnsMenu={false} + showSearch={false} remove those controls', () => {
    const u = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui
          data={people}
          columns={columns}
          getRowId={(r) => r.id}
          showSearch={false}
          showColumnsMenu={false}
        />
      </ThemeProvider>,
    )
    expect(u.queryByText('Columns')).toBeNull()
    expect(u.queryByPlaceholderText('Search…')).toBeNull()
  })
})

// Server DataSource (Plan.md §5) — the demo's server-driven section, asserted
// through the MUI adapter: the grid runs in manual mode and renders exactly the
// page the source hands back, no matter how large the dataset behind it is.
function ServerGrid() {
  const source = React.useMemo(() => createClientDataSource(serverPeople), [])
  const ds = useBstDataSource(source, { pageSize: 10, debounceMs: 0 })
  return (
    <ThemeProvider theme={createTheme()}>
      <BstTableMui<Person> columns={serverColumns} getRowId={(r) => r.id} {...ds.tableProps} />
    </ThemeProvider>
  )
}

describe('Server DataSource (Plan.md §5) drives the grid in manual mode', () => {
  test('renders only the fetched page (10 of 2,000 rows), and paging refetches', async () => {
    const u = render(<ServerGrid />)
    // one server page = 10 rows, NOT all 2,000 in the DOM
    await waitFor(() => expect(bodyRowCount(u.container)).toBe(10))
    expect(serverPeople.length).toBe(2000)

    const firstBefore = firstCellText(u.container)
    fireEvent.click(u.getByLabelText('Next page'))
    // page 2 refetches → a different first row, still exactly one page
    await waitFor(() => expect(firstCellText(u.container)).not.toBe(firstBefore))
    expect(bodyRowCount(u.container)).toBe(10)
  })

  test('sorting is server-wide: page 1 carries a global extreme, not the page max', async () => {
    const u = render(<ServerGrid />)
    await waitFor(() => expect(bodyRowCount(u.container)).toBe(10))

    const salaryOf = () => {
      const cells = u.container
        .querySelectorAll('tbody .bst-table-tr')[0]
        ?.querySelectorAll('.bst-table-td')
      return Number((cells?.[3]?.textContent ?? '').replace(/[^0-9]/g, ''))
    }
    const min = Math.min(...serverPeople.map((p) => p.salary ?? 0)) // 60,000
    const max = Math.max(...serverPeople.map((p) => p.salary ?? 0)) // 200,000

    // Sort by Salary — page 1's top row must be a GLOBAL extreme (a client sort
    // over the loaded 10 rows could not surface it). Direction-default agnostic.
    fireEvent.click(within(u.container).getByText('Salary'))
    await waitFor(() => expect([min, max]).toContain(salaryOf()))
    const afterFirst = salaryOf()

    // Toggle to the other direction → the opposite extreme leads.
    fireEvent.click(within(u.container).getByText('Salary'))
    await waitFor(() => expect(salaryOf()).toBe(afterFirst === max ? min : max))
  })
})

// ERP field formats (B1/B2) — the demo's KYC grid through the MUI adapter: a
// patterned cell masks its display (Aadhaar grouped, PAN upper-cased).
describe('ERP field formats (cellMeta.pattern) through the MUI adapter', () => {
  test('Aadhaar (number) renders masked; PAN (text) renders upper-cased', () => {
    const u = render(
      <ThemeProvider theme={createTheme()}>
        <BstTableMui<ErpVendor>
          data={erpVendors}
          columns={erpColumns}
          getRowId={(r) => r.id}
          pagination={false}
          showSearch={false}
        />
      </ThemeProvider>,
    )
    // Aadhaar masked as "#### #### ####"
    expect(u.container.textContent).toMatch(/\d{4} \d{4} \d{4}/)
    // PAN shown upper-cased
    expect(within(u.container).getByText('AAPFU0939F')).toBeInTheDocument()
  })
})
