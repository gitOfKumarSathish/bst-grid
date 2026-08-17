import { describe, test, expect } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import * as React from 'react'
import { BstFormulaBuilder } from '../BstFormulaBuilder'
import type { BstUserFormula } from '../index'

const rows = [{ age: 34, salary: 120000 }, { age: 28, salary: 90000 }, { age: 52, salary: 180000 }, { age: 26, salary: 82000 }]
const cols = [
  { id: 'age', header: 'Age', type: 'number' },
  { id: 'salary', header: 'Salary', type: 'number' },
]

describe('BstFormulaBuilder', () => {
  test('previews aggregates against the FULL dataset — MAX and MIN differ', () => {
    const max = render(
      <BstFormulaBuilder formulas={[{ id: 'c', header: 'C', expression: '=MAX(age)', type: 'number' }]} onChange={() => {}} columns={cols} sampleRows={rows} />,
    )
    expect(max.container.querySelector('.bst-fx-preview')?.textContent).toContain('52')
    max.unmount()
    const min = render(
      <BstFormulaBuilder formulas={[{ id: 'c', header: 'C', expression: '=MIN(age)', type: 'number' }]} onChange={() => {}} columns={cols} sampleRows={rows} />,
    )
    expect(min.container.querySelector('.bst-fx-preview')?.textContent).toContain('26')
  })

  test('auto-infers the result Type (text for a string formula)', () => {
    let latest: BstUserFormula[] = []
    const { container } = render(
      <BstFormulaBuilder formulas={[{ id: 'c', header: 'C', expression: '', type: 'number' }]} onChange={(f) => (latest = f)} columns={cols} sampleRows={rows} />,
    )
    const expr = container.querySelector('input.bst-fx-expr') as HTMLInputElement
    fireEvent.change(expr, { target: { value: '=IF(age > 30, "old", "young")' } })
    expect(latest[0].type).toBe('text') // string result → text, no manual pick needed
    fireEvent.change(expr, { target: { value: '=age * 2' } })
    expect(latest[0].type).toBe('number') // numeric result → number
  })

  test('shows an inline error for a bad formula', () => {
    const { container } = render(
      <BstFormulaBuilder formulas={[{ id: 'c', header: 'C', expression: '=(1 +', type: 'number' }]} onChange={() => {}} columns={cols} sampleRows={rows} />,
    )
    expect(container.querySelector('.bst-fx-invalid')).not.toBeNull()
  })
})
