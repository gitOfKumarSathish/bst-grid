import { describe, test, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import * as React from 'react'
import {
  useBstSettings,
  applySettingsOverrides,
  filterSettingsGroups,
  shouldShowSettingsSearch,
  isSettingActive,
  BST_SETTINGS_REGISTRY,
} from '../settings'
import type { BstSettingsGroup } from '../settings'

type Row = { id: string; name: string }
const data: Row[] = [{ id: '1', name: 'A' }]
const columns = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
] as any[]

describe('applySettingsOverrides (pure)', () => {
  test('returns the same object when there are no overrides', () => {
    const props = { data, columns, enableClipboard: true }
    expect(applySettingsOverrides(props, {})).toBe(props)
    expect(applySettingsOverrides(props, undefined)).toBe(props)
  })

  test('override=false turns a feature off; other keys pass through', () => {
    const props = { data, columns, enableClipboard: true, pagination: { pageSize: 8 } }
    const next = applySettingsOverrides(props, { enableClipboard: false }) as typeof props
    expect(next.enableClipboard).toBe(false)
    expect(next.pagination).toEqual({ pageSize: 8 }) // untouched
    expect(props.enableClipboard).toBe(true) // original not mutated
  })

  test('override=true preserves an options object (e.g. pagination { pageSize })', () => {
    const props = { data, columns, pagination: { pageSize: 8 } as boolean | { pageSize: number } }
    const off = applySettingsOverrides(props, { pagination: false }) as typeof props
    expect(off.pagination).toBe(false)
    const on = applySettingsOverrides(props, { pagination: true }) as typeof props
    expect(on.pagination).toEqual({ pageSize: 8 }) // object kept, not flattened to `true`
  })
})

// ---- hook harness -------------------------------------------------------------

function Settings({ persistKey, persist = false }: { persistKey?: string; persist?: boolean }) {
  const baseProps: any = { data, columns, enableClipboard: true }
  const { props: eff, model } = useBstSettings(baseProps, { persist, persistKey })
  return (
    <div>
      <span data-testid="clip">{String(eff.enableClipboard !== false)}</span>
      <span data-testid="sort">{String(eff.enableSorting !== false)}</span>
      <span data-testid="count">{model.overrideCount}</span>
      <span data-testid="labels">{model.items.map((i) => i.label).join('|')}</span>
      {model.items.map((it) => (
        <input
          key={it.key}
          type="checkbox"
          aria-label={it.label}
          checked={it.value}
          onChange={(e) => it.set(e.target.checked)}
        />
      ))}
      <button onClick={() => model.reset()}>reset</button>
    </div>
  )
}

function LabelsFor(props: any) {
  const { model } = useBstSettings(props, { persist: false })
  return (
    <>
      <span data-testid="labels">{model.items.map((i) => i.label).join('|')}</span>
      <span data-testid="groups">{model.groups.map((g) => g.name).join('|')}</span>
    </>
  )
}

// Every non-default-on toggle added since the sheet shipped.
const NEWER_LABELS = [
  'Row grouping',
  'Master-detail rows',
  'Pin rows',
  'Fit columns to width',
  'Responsive columns',
  'Cell spanning',
  'Validation',
]

// Always visible in the sheet (alwaysShow) so a user can enable them from settings —
// they don't wait to be provisioned by the developer.
const ALWAYS_VISIBLE_OPT_INS = [
  'Row grouping',
  'Copy column',
  'Copy row',
  'Per-column filter row',
  'Row virtualization',
  'Column virtualization',
  'Resize rows',
]
// The remaining opt-in newer features that appear only once provisioned.
const HIDDEN_UNTIL_PROVISIONED = NEWER_LABELS.filter((l) => !ALWAYS_VISIBLE_OPT_INS.includes(l))

const txt = (id: string) => screen.getByTestId(id).textContent

describe('useBstSettings (hook)', () => {
  beforeEach(() => window.localStorage.clear())

  test('shows provisioned + always-on features, hides un-provisioned opt-ins', () => {
    render(<Settings />)
    const labels = txt('labels') || ''
    // always-on data features
    expect(labels).toContain('Sorting')
    expect(labels).toContain('Global search')
    // provisioned opt-in feature (enableClipboard: true)
    expect(labels).toContain('Copy & paste')
    // un-provisioned opt-in feature — absent
    expect(labels).not.toContain('Inline editing')
    expect(labels).not.toContain('Row selection')
  })

  test('toggling a feature off flows into the effective props', () => {
    render(<Settings />)
    expect(txt('clip')).toBe('true')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Copy & paste' }))
    expect(txt('clip')).toBe('false') // enableClipboard === false now
    expect(txt('count')).toBe('1')
  })

  test('toggling an always-on feature (Sorting) off works too', () => {
    render(<Settings />)
    expect(txt('sort')).toBe('true')
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sorting' }))
    expect(txt('sort')).toBe('false')
  })

  test('re-selecting the developer value clears the override (count → 0)', () => {
    render(<Settings />)
    const box = screen.getByRole('checkbox', { name: 'Copy & paste' })
    fireEvent.click(box) // off → override
    expect(txt('count')).toBe('1')
    fireEvent.click(box) // back on → matches dev default → override dropped
    expect(txt('count')).toBe('0')
  })

  test('reset() restores every developer default', () => {
    render(<Settings />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Sorting' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Copy & paste' }))
    expect(txt('count')).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'reset' }))
    expect(txt('count')).toBe('0')
    expect(txt('sort')).toBe('true')
    expect(txt('clip')).toBe('true')
  })

  test('persists choices to localStorage and restores them on remount', () => {
    const { unmount } = render(<Settings persist persistKey="unit-test" />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Copy & paste' }))
    expect(txt('clip')).toBe('false')
    // storage written under the namespaced key
    const raw = window.localStorage.getItem('bst-table:settings:unit-test')
    expect(raw && JSON.parse(raw)).toEqual({ enableClipboard: false })
    unmount()
    // fresh mount reads the persisted override
    render(<Settings persist persistKey="unit-test" />)
    expect(txt('clip')).toBe('false')
    expect(txt('count')).toBe('1')
  })

  test('registry is internally consistent (unique keys, valid layers)', () => {
    const keys = BST_SETTINGS_REGISTRY.map((e) => e.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const e of BST_SETTINGS_REGISTRY) {
      expect(['engine', 'chrome']).toContain(e.layer)
      expect(e.label.length).toBeGreaterThan(0)
    }
  })
})

describe('useBstSettings — newer features (added after the sheet shipped)', () => {
  beforeEach(() => window.localStorage.clear())

  test('all newer feature toggles appear once the developer provisions them', () => {
    render(
      <LabelsFor
        data={data}
        columns={columns}
        enableGrouping
        enableExpanding
        enableRowPinning
        fitColumns
        enableResponsive
        enableCellSpanning
        enableValidation
      />,
    )
    const labels = txt('labels') || ''
    for (const l of NEWER_LABELS) expect(labels).toContain(l)
    // they land in the expected groups (incl. the new "Rows" group)
    expect(txt('groups')).toContain('Rows')
  })

  test('opt-in toggles stay hidden until provisioned (except the always-visible ones)', () => {
    render(<LabelsFor data={data} columns={columns} />)
    const labels = txt('labels') || ''
    for (const l of HIDDEN_UNTIL_PROVISIONED) expect(labels).not.toContain(l)
  })

  test('grouping + copy-column + copy-row are always customizable (shown even unprovisioned)', () => {
    render(<LabelsFor data={data} columns={columns} />)
    const labels = txt('labels') || ''
    for (const l of ALWAYS_VISIBLE_OPT_INS) expect(labels).toContain(l)
  })

  test('virtualization (D1) is discoverable — a Performance group, shown even unprovisioned', () => {
    // The user's escape hatch for a slow/large grid: turn virtualization on from
    // the settings sheet without any developer wiring.
    render(<LabelsFor data={data} columns={columns} />)
    expect(txt('groups')).toContain('Performance')
    expect(txt('labels')).toContain('Row virtualization')
    expect(txt('labels')).toContain('Column virtualization')
  })

  test('row resize (G2) is discoverable — shown in the Rows group even unprovisioned', () => {
    // Like virtualization, row resize is an end-user escape hatch: switch it on
    // from the settings sheet without any developer wiring (alwaysShow).
    render(<LabelsFor data={data} columns={columns} />)
    expect(txt('groups')).toContain('Rows')
    expect(txt('labels')).toContain('Resize rows')
  })

  test('conditional formatting is always offered (default on), rules or not', () => {
    // no rules → still shown (alwaysShow), so users always find the switch
    const { unmount } = render(<LabelsFor data={data} columns={columns} />)
    expect(txt('labels')).toContain('Conditional formatting')
    unmount()
    // rules present → shown too, default on
    render(
      <LabelsFor
        data={data}
        columns={columns}
        conditionalFormats={[{ columnId: 'name', when: { op: 'equals', value: 'A' }, className: 'x' }]}
      />,
    )
    expect(txt('labels')).toContain('Conditional formatting')
  })

  test('turning conditional formatting off flows into the effective props', () => {
    const props = {
      data,
      columns,
      conditionalFormats: [{ columnId: 'name', when: { op: 'equals', value: 'A' }, className: 'x' }],
    }
    const next = applySettingsOverrides(props, { enableConditionalFormatting: false }) as any
    expect(next.enableConditionalFormatting).toBe(false)
    expect(next.conditionalFormats).toEqual(props.conditionalFormats) // rules kept, just inert
  })

  test('the settings registry covers every instance-level boolean engine toggle', () => {
    // Guards CLAUDE.md §12 "settings-sheet parity": if a new enable*/fit* boolean
    // is added to the engine toggles it must be registered here too.
    const EXPECTED_ENGINE_TOGGLES = [
      'enableSorting',
      'enableGlobalFilter',
      'enableColumnFilters',
      'enableGrouping',
      'pagination',
      'enableColumnResizing',
      'enableHiding',
      'enableColumnPinning',
      'enableColumnOrdering',
      'enableColumnFilterRow',
      'fitColumns',
      'enableResponsive',
      'enableExpanding',
      'enableRowPinning',
      'enableRowResize',
      'enableEditing',
      'enableBatchEditing',
      'enableValidation',
      'enableRowActions',
      'enableUndoRedo',
      'enableRowSelection',
      'enableCellSelection',
      'enableClipboard',
      'enableCopyColumn',
      'enableCopyRow',
      'enableCellSpanning',
      'enableConditionalFormatting',
    ]
    const registered = new Set(BST_SETTINGS_REGISTRY.map((e) => e.key))
    for (const key of EXPECTED_ENGINE_TOGGLES) expect(registered.has(key as any)).toBe(true)
  })
})

describe('useBstSettings — batch-editing toggle (enableBatchEditing)', () => {
  beforeEach(() => window.localStorage.clear())

  function BatchModel(props: any) {
    const { props: eff, model } = useBstSettings(props, { persist: false })
    const item = model.items.find((i) => i.key === 'enableBatchEditing')!
    return (
      <div>
        <span data-testid="value">{String(item.value)}</span>
        <span data-testid="flag">{String((eff as any).enableBatchEditing)}</span>
        <input
          type="checkbox"
          aria-label={item.label}
          checked={item.value}
          onChange={(e) => item.set(e.target.checked)}
        />
      </div>
    )
  }

  test("the switch derives its value from enableEditing.mode — 'batch' shows ON", () => {
    render(<BatchModel data={data} columns={columns} enableEditing={{ mode: 'batch' }} />)
    expect(txt('value')).toBe('true') // no explicit enableBatchEditing prop needed
  })

  test('plain editing (cell mode) shows the switch OFF but offered (alwaysShow)', () => {
    render(<BatchModel data={data} columns={columns} enableEditing />)
    expect(txt('value')).toBe('false')
  })

  test('switching it off on a batch grid flows enableBatchEditing:false into the props', () => {
    render(<BatchModel data={data} columns={columns} enableEditing={{ mode: 'batch' }} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Batch editing' }))
    expect(txt('value')).toBe('false')
    expect(txt('flag')).toBe('false') // useBstTable resolves this to per-cell commits
    // flipping back ON matches the developer base again → override dropped, mode batch
    fireEvent.click(screen.getByRole('checkbox', { name: 'Batch editing' }))
    expect(txt('value')).toBe('true')
    expect(txt('flag')).toBe('undefined') // no override — follows enableEditing.mode
  })

  test('applySettingsOverrides keeps the enableEditing options object intact', () => {
    const props = { data, columns, enableEditing: { mode: 'batch', policy: 'commitButFlag' } }
    const next = applySettingsOverrides(props, { enableBatchEditing: false }) as any
    expect(next.enableBatchEditing).toBe(false)
    expect(next.enableEditing).toEqual({ mode: 'batch', policy: 'commitButFlag' }) // untouched
  })
})

// ---- search box helpers (pure) ------------------------------------------------
const mkGroups = (): BstSettingsGroup[] =>
  [
    {
      name: 'Columns',
      items: [
        { key: 'enableColumnPinning', label: 'Pin columns', hint: undefined },
        { key: 'enableColumnResizing', label: 'Resize columns', hint: undefined },
      ],
    },
    {
      name: 'Export',
      items: [
        { key: 'enableExport', label: 'Export', hint: 'Toolbar Export menu' },
        { key: 'enablePrint', label: 'Print', hint: 'needs Export' },
      ],
    },
  ] as unknown as BstSettingsGroup[]

describe('filterSettingsGroups (pure)', () => {
  test('empty / whitespace query returns all groups (fresh copies)', () => {
    const groups = mkGroups()
    const out = filterSettingsGroups(groups, '')
    expect(out.map((g) => g.name)).toEqual(['Columns', 'Export'])
    expect(filterSettingsGroups(groups, '   ').map((g) => g.name)).toEqual(['Columns', 'Export'])
    // returns fresh group objects — never the source references (no mutation risk)
    expect(out[0]).not.toBe(groups[0])
  })

  test('matches on label, case-insensitively, dropping non-matching groups', () => {
    const out = filterSettingsGroups(mkGroups(), 'PIN')
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('Columns')
    expect(out[0].items.map((i) => i.label)).toEqual(['Pin columns'])
  })

  test('matches on a hint', () => {
    const out = filterSettingsGroups(mkGroups(), 'toolbar')
    expect(out).toHaveLength(1)
    expect(out[0].items.map((i) => i.label)).toEqual(['Export'])
  })

  test('a matching group name keeps ALL of its items', () => {
    const out = filterSettingsGroups(mkGroups(), 'export')
    // "export" matches the Export group name → both its items survive, even
    // though "Print"'s label does not contain "export".
    const exportGroup = out.find((g) => g.name === 'Export')!
    expect(exportGroup.items.map((i) => i.label)).toEqual(['Export', 'Print'])
  })

  test('no matches → empty array', () => {
    expect(filterSettingsGroups(mkGroups(), 'zzz')).toEqual([])
  })
})

describe('shouldShowSettingsSearch (pure)', () => {
  test('explicit false never shows; explicit true always shows', () => {
    expect(shouldShowSettingsSearch(false, 100)).toBe(false)
    expect(shouldShowSettingsSearch(true, 0)).toBe(true)
  })
  test('unset → auto: only for lists longer than a handful', () => {
    expect(shouldShowSettingsSearch(undefined, 6)).toBe(false)
    expect(shouldShowSettingsSearch(undefined, 7)).toBe(true)
  })
})

// ---- dependency cascade (a parent off disables its dependents) ----------------
describe('isSettingActive (pure, dependency cascade)', () => {
  test('a toggle is inactive while a prerequisite is off', () => {
    expect(isSettingActive('enableExport', {})).toBe(false) // off by default
    expect(isSettingActive('enableCsvExport', {})).toBe(false) // needs Export
    expect(isSettingActive('enableCsvExport', { enableExport: true })).toBe(true)
  })
  test('resolves transitively through a chain', () => {
    const on = { enableColumnFilters: true, enableColumnFilterRow: true, enableSetFilter: true }
    expect(isSettingActive('enableSetFilter', on)).toBe(true)
    // filter row is on, but its own prerequisite (column filters) is off → the
    // whole chain below it is inactive.
    const off = { enableColumnFilters: false, enableColumnFilterRow: true, enableSetFilter: true }
    expect(isSettingActive('enableColumnFilterRow', off)).toBe(false)
    expect(isSettingActive('enableSetFilter', off)).toBe(false)
  })
})

function DepHarness(props: any) {
  const { model } = useBstSettings(props, { persist: false })
  return (
    <>
      {model.items.map((it) => (
        <span key={it.key} data-testid={`dis:${it.key}`}>
          {String(it.disabled)}
        </span>
      ))}
    </>
  )
}
const dis = (key: string) => screen.queryByTestId(`dis:${key}`)?.textContent

describe('useBstSettings — dependency cascade (item.disabled)', () => {
  beforeEach(() => window.localStorage.clear())

  test('export sub-toggles disable while Export is off, enable when it is on', () => {
    const { unmount } = render(<DepHarness data={data} columns={columns} />)
    expect(dis('enableCsvExport')).toBe('true') // enableExport defaults off
    expect(dis('enableExcelExport')).toBe('true')
    expect(dis('enablePrint')).toBe('true')
    unmount()
    render(<DepHarness data={data} columns={columns} enableExport />)
    expect(dis('enableCsvExport')).toBe('false')
    expect(dis('enablePrint')).toBe('false')
  })

  test('cascade is transitive: column filters off → filter row AND set filter disabled', () => {
    render(
      <DepHarness
        data={data}
        columns={columns}
        enableColumnFilters={false}
        enableColumnFilterRow
        enableSetFilter
      />,
    )
    expect(dis('enableColumnFilterRow')).toBe('true')
    expect(dis('enableSetFilter')).toBe('true')
  })

  test('toggling a parent live re-enables its dependents', () => {
    render(<DepHarness data={data} columns={columns} enableClipboard={false} />)
    // copy column/row require Copy & paste (off) → disabled
    expect(dis('enableCopyColumn')).toBe('true')
    expect(dis('enableCopyRow')).toBe('true')
  })
})
