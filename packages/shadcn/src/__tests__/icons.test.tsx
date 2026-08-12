import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'
import {
  BstTableShadcn,
  defaultIcons,
  resolveIcons,
  ICON_SLOTS,
  type BstShadcnIcons,
} from '../index'
import { lucideIcons } from '../icons/lucide'
import { tablerIcons } from '../icons/tabler'
import { phosphorIcons } from '../icons/phosphor'
import { remixIcons } from '../icons/remix'
import { hugeiconsIcons } from '../icons/hugeicons'
import type { BstTableColumn } from '@bloomskill/table-engine'

const PRESETS: Record<string, BstShadcnIcons> = {
  lucide: lucideIcons,
  tabler: tablerIcons,
  phosphor: phosphorIcons,
  remix: remixIcons,
  hugeicons: hugeiconsIcons,
}

type Person = { id: string; name: string; age: number }
const seed: Person[] = [{ id: '1', name: 'Ada', age: 30 }]
const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } },
]

describe('icon registry — resolveIcons', () => {
  test('no overrides returns the built-in defaults', () => {
    expect(resolveIcons()).toBe(defaultIcons)
    expect(resolveIcons({}).search).toBe(defaultIcons.search)
  })

  test('a partial map overrides only the given slots', () => {
    const Custom = () => null
    const merged = resolveIcons({ search: Custom })
    expect(merged.search).toBe(Custom)
    expect(merged.settings).toBe(defaultIcons.settings)
  })

  test('an undefined slot falls back to the default (stale-name safety net)', () => {
    const merged = resolveIcons({ search: undefined as unknown as BstShadcnIcons['search'] })
    expect(merged.search).toBe(defaultIcons.search)
  })

  test('every default slot is a component', () => {
    for (const slot of ICON_SLOTS) {
      expect(typeof defaultIcons[slot], `defaultIcons.${slot}`).toBe('function')
    }
  })
})

describe('icon presets — verified against the real libraries', () => {
  // Each preset is imported against its actual library (all installed as
  // devDeps), so a renamed/removed export would fail to resolve here — and the
  // build already type-checks every slot name against the real package types.
  for (const [name, preset] of Object.entries(PRESETS)) {
    test(`${name}: all ${ICON_SLOTS.length} slots resolve to a renderable component`, () => {
      for (const slot of ICON_SLOTS) {
        expect(preset[slot], `${name}.${slot}`).toBeTruthy()
        expect(
          React.isValidElement(React.createElement(preset[slot], { size: 16 })),
          `${name}.${slot} renders`,
        ).toBe(true)
      }
    })
  }
})

describe('chrome renders SVG icons, not emoji/glyphs', () => {
  test('toolbar icons are <svg> and no emoji/glyph text leaks into the card', () => {
    const { container } = render(
      <BstTableShadcn<Person>
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        enableEditing
        enableRowActions
        showDensityToggle
        showFilterBuilder
        enableColumnFilters
        showSettings
        onDataChange={() => {}}
      />,
    )
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(3)
    // The glyphs/emoji this work replaced must not appear anywhere in the card.
    expect(container.textContent ?? '').not.toMatch(/[📌⚙↶↷▾✕‹›✓]/u)
  })

  test('the `icons` prop injects a custom component into a slot', () => {
    render(
      <BstTableShadcn<Person>
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        icons={{ search: () => <svg data-testid="custom-search" /> }}
      />,
    )
    expect(screen.getByTestId('custom-search')).toBeInTheDocument()
  })
})

describe('theme + dark classes on the outer card', () => {
  const card = (ui: React.ReactElement) =>
    render(ui).container.querySelector('.sc-card') as HTMLElement

  test('default is zinc, light-following (no inherit/dark/light class)', () => {
    const el = card(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} />)
    expect(el).not.toHaveClass('sc-inherit')
    expect(el).not.toHaveClass('sc-dark')
    expect(el).not.toHaveClass('sc-light')
  })

  test('theme="inherit" adds sc-inherit; tokenFormat="oklch" adds sc-fmt-color', () => {
    const hsl = card(
      <BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} theme="inherit" />,
    )
    expect(hsl).toHaveClass('sc-inherit')
    expect(hsl).not.toHaveClass('sc-fmt-color')
    const oklch = card(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        theme="inherit"
        tokenFormat="oklch"
      />,
    )
    expect(oklch).toHaveClass('sc-inherit', 'sc-fmt-color')
  })

  test('dark prop is tri-state: true→sc-dark, false→sc-light, unset→neither', () => {
    expect(
      card(<BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} dark />),
    ).toHaveClass('sc-dark')
    expect(
      card(
        <BstTableShadcn data={seed} columns={columns} getRowId={(r) => r.id} dark={false} />,
      ),
    ).toHaveClass('sc-light')
  })

  test('inherit ignores the dark prop (host .dark drives it)', () => {
    const el = card(
      <BstTableShadcn
        data={seed}
        columns={columns}
        getRowId={(r) => r.id}
        theme="inherit"
        dark
      />,
    )
    expect(el).toHaveClass('sc-inherit')
    expect(el).not.toHaveClass('sc-dark')
  })
})
