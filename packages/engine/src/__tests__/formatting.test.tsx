import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import {
  useBstTable,
  BstTable,
  evalCellFormat,
  BstConditionalFormatBuilder,
} from '../index'
import type { BstTableColumn, UseBstTableOptions, BstFormatRule } from '../index'

type Row = { id: string; name: string; salary: number; status: string }
const seed: Row[] = [
  { id: '1', name: 'Ada', salary: 150000, status: 'active' },
  { id: '2', name: 'Bo', salary: 80000, status: 'overdue' },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'salary', accessorKey: 'salary', header: 'Salary', meta: { type: 'number' } },
  { id: 'status', accessorKey: 'status', header: 'Status', meta: { type: 'text' } },
]

function Grid(props: Partial<UseBstTableOptions<Row>>) {
  const table = useBstTable<Row>({ data: seed, columns, getRowId: (r) => r.id, ...props })
  return <BstTable table={table} />
}

describe('conditional formatting (K3)', () => {
  test('evalCellFormat matches only active, correctly-scoped conditions', () => {
    const rules: BstFormatRule<Row>[] = [
      { columnId: 'salary', when: { op: 'gte', value: 100000 }, className: 'hi', style: { color: 'red' } },
      { columnId: 'salary', when: { op: 'gte', value: '' }, className: 'incomplete' }, // no value → no match
    ]
    const getVal = (c: string) => (c === 'salary' ? 150000 : undefined)
    const hit = evalCellFormat(rules, { value: 150000, row: seed[0], rowId: '1', columnId: 'salary' }, getVal)
    expect(hit.className).toBe('hi')
    expect(hit.style).toEqual({ color: 'red' })
    // a salary-scoped rule never touches another column
    const miss = evalCellFormat(rules, { value: 'Ada', row: seed[0], rowId: '1', columnId: 'name' }, getVal)
    expect(miss.className).toBeUndefined()
  })

  test('applies cell + row rules to the DOM and can blank a cell (F5)', () => {
    const rules: BstFormatRule<Row>[] = [
      { columnId: 'salary', when: { op: 'gte', value: 100000 }, className: 'cf-hi', style: { color: 'rgb(1, 2, 3)' } },
      { scope: 'row', columnId: 'status', when: { op: 'equals', value: 'overdue' }, className: 'cf-overdue' },
      { columnId: 'name', when: { op: 'equals', value: 'Bo' }, hideContent: true },
    ]
    const { container } = render(<Grid conditionalFormats={rules} />)
    const rows = container.querySelectorAll('tbody tr.bst-table-tr')
    const ada = rows[0].querySelectorAll('td.bst-table-td')
    const bo = rows[1].querySelectorAll('td.bst-table-td')

    // cell rule: Ada's salary (150k) is styled; Bo's (80k) is not
    expect(ada[1]).toHaveClass('cf-hi')
    expect((ada[1] as HTMLElement).style.color).toBe('rgb(1, 2, 3)')
    expect(bo[1]).not.toHaveClass('cf-hi')

    // row rule: every cell of Bo's row (status = overdue) is tagged
    bo.forEach((td) => expect(td).toHaveClass('cf-overdue'))
    expect(ada[0]).not.toHaveClass('cf-overdue')

    // F5 hideContent: Bo's name cell renders blank
    expect(bo[0].textContent).toBe('')
    expect(ada[0].textContent).toContain('Ada')
  })

  test('enableConditionalFormatting={false} switches the rules off without dropping them', () => {
    const rules: BstFormatRule<Row>[] = [
      { columnId: 'salary', when: { op: 'gte', value: 100000 }, className: 'cf-hi' },
      { columnId: 'name', when: { op: 'equals', value: 'Bo' }, hideContent: true },
    ]
    const { container } = render(
      <Grid conditionalFormats={rules} enableConditionalFormatting={false} />,
    )
    const rows = container.querySelectorAll('tbody tr.bst-table-tr')
    const ada = rows[0].querySelectorAll('td.bst-table-td')
    const bo = rows[1].querySelectorAll('td.bst-table-td')
    expect(ada[1]).not.toHaveClass('cf-hi') // rule not applied
    expect(bo[0].textContent).toContain('Bo') // F5 blanking not applied either
  })

  test('the builder adds a rule via onChange', () => {
    let out: BstFormatRule[] = []
    render(
      <BstConditionalFormatBuilder
        rules={[]}
        onChange={(r) => (out = r)}
        columns={[{ id: 'salary', header: 'Salary', type: 'number' }]}
      />,
    )
    fireEvent.click(screen.getByText('+ Add rule'))
    expect(out).toHaveLength(1)
    expect(out[0].columnId).toBe('salary')
    expect(out[0].scope).toBe('cell')
  })
})
