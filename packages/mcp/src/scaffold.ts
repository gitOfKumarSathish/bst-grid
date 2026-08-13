import type { BstCorpus } from './types.js'

/** A capability an agent can ask the scaffolder for, in plain terms. */
export const SCAFFOLD_FEATURES = [
  'sorting',
  'globalSearch',
  'columnFilters',
  'filterBuilder',
  'pagination',
  'grouping',
  'columnPinning',
  'columnReorder',
  'responsive',
  'fitColumns',
  'rowSelection',
  'rowActions',
  'masterDetail',
  'rowPinning',
  'editing',
  'batchEditing',
  'validation',
  'undoRedo',
  'cellSelection',
  'clipboard',
  'conditionalFormatting',
  'density',
  'settingsSheet',
  'serverMode',
] as const

export type ScaffoldFeature = (typeof SCAFFOLD_FEATURES)[number]

/**
 * Placeholder replaced with the first column's id, so generated sample code
 * (a grouping key, a detail panel field) refers to a column that exists.
 */
const FIRST_COLUMN = '__FIRST_COLUMN__'

/** One capability's contribution to the generated component. */
interface Preset {
  /** Props as JSX attribute source; converted to object syntax for the headless adapter. */
  props: string[]
  /** Whether it needs the controlled-data write-back. */
  needsDataChange?: boolean
  /** Whether it needs `getRowId`. */
  needsRowId?: boolean
  /** Extra component-scope code. */
  body?: string[]
  /** Extra named imports from `@bloomskill/table-engine`. */
  engineImports?: string[]
  /** Type-only imports from `@bloomskill/table-engine`. */
  engineTypeImports?: string[]
  /** A note worth surfacing next to the code. */
  note?: string
}

/**
 * Maps each capability to the flags it actually needs — including the ones a
 * developer forgets. `clipboard` emits `enableCellSelection` because clipboard
 * implies it; `editing` emits `getRowId` + `onDataChange` because writes target
 * rows by id. The point of scaffolding is that the dependencies come for free.
 */
const PRESETS: Record<ScaffoldFeature, Preset> = {
  sorting: { props: ['enableSorting'] },
  globalSearch: { props: ['enableGlobalFilter', 'showSearch'] },
  columnFilters: { props: ['enableColumnFilters', 'enableColumnFilterRow'] },
  filterBuilder: { props: ['enableColumnFilters', 'showFilterBuilder'] },
  pagination: { props: ['pagination={{ pageSize: 10 }}', 'showPagination'] },
  grouping: {
    props: ['enableGrouping', `initialState={{ grouping: ['${FIRST_COLUMN}'] }}`],
    note: 'Aggregate a column by declaring `aggregationFn` on it (`sum`, `count`, `mean`, `min`, `max`, `extent`, `uniqueCount`).',
  },
  columnPinning: { props: ['enableColumnPinning'] },
  columnReorder: { props: ['enableColumnOrdering'] },
  responsive: {
    props: ['enableResponsive'],
    note: 'Set `meta.responsivePriority` per column — higher survives longer as the grid narrows.',
  },
  fitColumns: {
    props: ['fitColumns'],
    note: 'Fits columns to the viewport (no horizontal scroll); suppresses manual resizing.',
  },
  rowSelection: { props: ['enableRowSelection', 'showSelectionInfo'], needsRowId: true },
  rowActions: {
    props: ['enableRowActions', 'showAddRow', 'createRow={() => ({})}'],
    needsDataChange: true,
    needsRowId: true,
  },
  masterDetail: {
    props: ['enableExpanding', 'renderDetail={renderDetail}'],
    body: [
      'const renderDetail = (row: __ROW__) => (',
      `  <div style={{ padding: 12 }}>Details for {String(row.${FIRST_COLUMN})}</div>`,
      ')',
    ],
  },
  rowPinning: { props: ['enableRowPinning'] },
  editing: {
    props: ['enableEditing', 'showSaveBar'],
    needsDataChange: true,
    needsRowId: true,
  },
  batchEditing: {
    props: ["enableEditing={{ mode: 'batch' }}", 'onSave={handleSave}', 'showChangesSheet'],
    needsDataChange: true,
    needsRowId: true,
    body: [
      '// Fires ONCE per save action with the whole change set — make exactly one',
      '// request here, never one per cell. Throwing keeps every draft so the user can retry.',
      'const handleSave = async (event: BstSaveEvent<__ROW__>) => {',
      "  const response = await fetch('/api/rows', {",
      "    method: 'PATCH',",
      "    headers: { 'Content-Type': 'application/json' },",
      '    body: JSON.stringify(event.rows.map((r) => ({ id: r.rowId, ...r.patch }))),',
      '  })',
      '  if (!response.ok) throw new Error(`Save failed: ${response.status}`)',
      '}',
    ],
    engineTypeImports: ['BstSaveEvent'],
  },
  validation: { props: ['enableValidation'], needsRowId: true, needsDataChange: true },
  undoRedo: { props: ['enableUndoRedo', 'showUndoRedo'], needsDataChange: true },
  cellSelection: { props: ['enableCellSelection'] },
  clipboard: {
    props: ['enableCellSelection', 'enableClipboard'],
    note: 'Copy works read-only; paste additionally requires editing.',
  },
  conditionalFormatting: {
    props: ['conditionalFormats={formats}', 'showFormatBuilder'],
    body: [
      'const formats: BstFormatRule<__ROW__>[] = [',
      `  { scope: 'cell', columnId: '${FIRST_COLUMN}', when: { op: 'notEmpty' }, style: { fontWeight: 600 } },`,
      ']',
    ],
    engineTypeImports: ['BstFormatRule'],
  },
  density: { props: ['showDensityToggle'] },
  settingsSheet: {
    props: ['showSettings'],
    note: "Renders a gear → a sheet where end-users flip this grid's features on/off themselves.",
  },
  serverMode: {
    props: ['{...tableProps}'],
    body: [
      '// Swap `createClientDataSource` for `createServerDataSource` to hit a real',
      '// endpoint — the grid is identical either way. Memoised so it does not refetch',
      '// on every render.',
      'const source = React.useMemo(() => createClientDataSource<__ROW__>(allRows), [])',
      'const { tableProps } = useBstDataSource<__ROW__>(source, { pageSize: 25 })',
    ],
    engineImports: ['createClientDataSource', 'useBstDataSource'],
    note: 'Server mode owns the data: the grid renders the page `tableProps` supplies, and sort/filter/paginate run in the DataSource.',
  },
}

/** Cell types whose renderer is driven by `meta.options`. */
const OPTION_BASED = new Set(['singleSelect', 'multiSelect', 'radio'])

/** A column the caller wants generated. */
export interface ScaffoldColumn {
  id: string
  header?: string
  /** A `meta.type` value; omitted means the default `text` renderer. */
  type?: string
  editable?: boolean
}

export interface ScaffoldRequest {
  adapter: 'mui' | 'shadcn' | 'engine'
  features: ScaffoldFeature[]
  columns: ScaffoldColumn[]
  rowTypeName?: string
}

export interface ScaffoldResult {
  code: string
  /** Install line for the packages the snippet imports. */
  install: string
  /** Capability notes worth surfacing alongside the code. */
  notes: string[]
}

/** TS type for a column, inferred from its cell type — used for the `Row` shape. */
function tsTypeFor(cellType: string | undefined, corpus: BstCorpus): string {
  const entry = corpus.cellTypes.find((c) => c.type === cellType)
  const shape = entry?.valueShape ?? 'string'
  return shape.replace(/`/g, '').trim() || 'string'
}

/** The attribute name a JSX prop source string sets. */
function propName(prop: string): string {
  if (prop.startsWith('{...')) return prop
  return prop.split('=')[0]?.trim() ?? prop
}

/**
 * Rewrites a JSX attribute as an object property, for the headless adapter
 * where options go into `useBstTable({...})` rather than onto an element.
 */
function toObjectProperty(prop: string): string {
  if (prop.startsWith('{...')) return `...${prop.slice(4, -1)}`
  const eq = prop.indexOf('=')
  if (eq < 0) return `${prop}: true`
  const name = prop.slice(0, eq)
  const raw = prop.slice(eq + 1)
  // `foo={expr}` → `foo: expr`
  const value = raw.startsWith('{') && raw.endsWith('}') ? raw.slice(1, -1).trim() : raw
  return value === name ? name : `${name}: ${value}` // shorthand when they match
}

/** Builds a complete, compiling single-file component. */
export function scaffoldGrid(corpus: BstCorpus, request: ScaffoldRequest): ScaffoldResult {
  const { adapter, features, columns } = request
  const Row = request.rowTypeName ?? 'Row'
  const headless = adapter === 'engine'
  const firstColumn = columns[0]?.id ?? 'id'

  const fill = (text: string): string =>
    text.replaceAll(FIRST_COLUMN, firstColumn).replaceAll('__ROW__', Row)

  // A prop set keyed by ATTRIBUTE NAME, so `enableEditing` and
  // `enableEditing={{ mode: 'batch' }}` can't both land on the element (JSX
  // rejects duplicate attributes). The one carrying a value wins.
  const props = new Map<string, string>()
  const addProp = (prop: string): void => {
    const name = propName(prop)
    const existing = props.get(name)
    if (existing && existing.includes('=') && !prop.includes('=')) return
    props.set(name, prop)
  }

  const engineImports = new Set<string>()
  const engineTypeImports = new Set<string>(['BstTableColumn'])
  const bodies: string[][] = []
  const notes: string[] = []
  let needsRowId = false
  let needsDataChange = false

  for (const feature of features) {
    const preset = PRESETS[feature]
    if (!preset) continue
    for (const prop of preset.props) {
      // The headless engine renders no chrome, so `show*` props don't apply.
      if (headless && prop.startsWith('show')) continue
      addProp(prop)
    }
    for (const imp of preset.engineImports ?? []) engineImports.add(imp)
    for (const imp of preset.engineTypeImports ?? []) engineTypeImports.add(imp)
    if (preset.body) bodies.push(preset.body)
    if (preset.note) notes.push(preset.note)
    needsRowId ||= Boolean(preset.needsRowId)
    needsDataChange ||= Boolean(preset.needsDataChange)
  }

  const isServerMode = features.includes('serverMode')
  const component = headless ? 'BstTable' : adapter === 'mui' ? 'BstTableMui' : 'BstTableShadcn'
  const pkg = headless
    ? '@bloomskill/table-engine'
    : adapter === 'mui'
      ? '@bloomskill/table-mui'
      : '@bloomskill/table-shadcn'

  if (headless) engineImports.add('useBstTable')

  // Server mode supplies the data; local editing state is redundant there and
  // would fight the DataSource for ownership of `data`.
  const localData = !isServerMode
  if (needsRowId) addProp('getRowId={(row) => row.id}')
  if (needsDataChange && localData) addProp('onDataChange={setRows}')
  if (needsDataChange && isServerMode) {
    notes.push(
      'Editing is combined with server mode here: the DataSource owns `data`, so persist through `onSave` (or your own handler) and refetch, rather than mutating a local array.',
    )
  }

  const needsReact = (needsDataChange && localData) || isServerMode || headless

  // ---- imports ----
  const imports: string[] = []
  if (needsReact) imports.push(`import * as React from 'react'`)
  if (headless) {
    imports.push(`import { ${['BstTable', ...engineImports].sort().join(', ')} } from '@bloomskill/table-engine'`)
  } else {
    imports.push(`import { ${component} } from '${pkg}'`)
    if (engineImports.size) {
      imports.push(`import { ${[...engineImports].sort().join(', ')} } from '@bloomskill/table-engine'`)
    }
  }
  imports.push(`import type { ${[...engineTypeImports].sort().join(', ')} } from '@bloomskill/table-engine'`)
  imports.push(`import '@bloomskill/table-engine/styles.css'`)
  if (adapter === 'shadcn') imports.push(`import '@bloomskill/table-shadcn/styles.css'`)

  // ---- row type + columns ----
  const rowFields = ['  id: string', ...columns.map((c) => `  ${c.id}: ${tsTypeFor(c.type, corpus)}`)]

  const columnDefs = columns.map((col) => {
    const meta: string[] = []
    if (col.type && col.type !== 'text') meta.push(`type: '${col.type}'`)
    if (col.editable) meta.push('editable: true')
    // Option-based types render nothing without `meta.options`, so emit a
    // placeholder set rather than a column that silently comes up empty.
    if (col.type && OPTION_BASED.has(col.type)) {
      meta.push(`options: [{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }] /* TODO: your options */`)
    }
    const metaPart = meta.length ? `, meta: { ${meta.join(', ')} }` : ''
    const header = col.header ?? col.id.replace(/^./, (ch) => ch.toUpperCase())
    return `  { id: '${col.id}', accessorKey: '${col.id}', header: '${header}'${metaPart} },`
  })

  if (columns.some((c) => c.type && OPTION_BASED.has(c.type))) {
    notes.push(
      'Option-based columns (`singleSelect` / `multiSelect` / `radio`) were given placeholder `meta.options` — replace them with your real choices. `BstOption` also accepts `color`, `icon` and `avatar` for richer badges.',
    )
  }

  // ---- component body ----
  const dataDecl = isServerMode ? 'allRows' : 'initialRows'
  const stateLine =
    needsDataChange && localData
      ? `const [rows, setRows] = React.useState<${Row}[]>(initialRows)`
      : localData
        ? `const rows = initialRows`
        : null

  const gridProps = [
    ...(localData ? ['data={rows}'] : []),
    'columns={columns}',
    ...[...props.values()].sort(),
  ]

  const render = headless
    ? [
        `  const table = useBstTable<${Row}>({`,
        ...gridProps.map((p) => `    ${toObjectProperty(p)},`),
        `  })`,
        '',
        `  return <BstTable table={table} />`,
      ]
    : [`  return (`, `    <${component}`, ...gridProps.map((p) => `      ${p}`), `    />`, `  )`]

  const code = [
    ...imports,
    '',
    `interface ${Row} {`,
    ...rowFields,
    '}',
    '',
    `const columns: BstTableColumn<${Row}>[] = [`,
    ...columnDefs,
    ']',
    '',
    `const ${dataDecl}: ${Row}[] = [`,
    `  // …your data`,
    ']',
    '',
    `export function ExampleGrid() {`,
    ...(stateLine ? [`  ${stateLine}`, ''] : []),
    ...bodies.flatMap((body) => [...body.map((line) => `  ${line}`), '']),
    ...render,
    `}`,
    '',
  ]
    .join('\n')
    .replaceAll(FIRST_COLUMN, firstColumn)
    .replaceAll('__ROW__', Row)

  const install = headless
    ? `npm install @bloomskill/table-engine@${corpus.version}`
    : `npm install @bloomskill/table-engine@${corpus.version} ${pkg}@${corpus.version}`

  if (adapter === 'mui') {
    notes.push('The MUI skin needs `@mui/material` and a `<ThemeProvider>` above the grid.')
  }
  if (headless) {
    notes.push(
      'The headless engine renders the grid body only — no toolbar, menus or pagination bar. Use an adapter (`mui` / `shadcn`) if you want chrome, or build your own around `useBstTable`.',
    )
  }

  return { code: fill(code), install, notes }
}
