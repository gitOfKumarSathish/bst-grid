// Runnable example sources for <BstSandbox example="…" />. Kept here (not inline in
// MDX) so the code strings never fight MDX escaping. Each is a complete App.tsx that
// Sandpack runs against the published @bloomskill packages (loaded from the npm CDN).

const HEAD = `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Row = { id: string; name: string; team: string; role: string; score: number }
const seed: Row[] = [
  { id: '1', name: 'Ada Lovelace',   team: 'Platform', role: 'Engineer', score: 92 },
  { id: '2', name: 'Alan Turing',    team: 'Research', role: 'Scientist', score: 88 },
  { id: '3', name: 'Grace Hopper',   team: 'Platform', role: 'Engineer', score: 95 },
  { id: '4', name: 'Katherine J.',   team: 'Research', role: 'Analyst',  score: 90 },
  { id: '5', name: 'Edsger Dijkstra',team: 'Platform', role: 'Architect',score: 84 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name',  accessorKey: 'name',  header: 'Name' },
  { id: 'team',  accessorKey: 'team',  header: 'Team' },
  { id: 'role',  accessorKey: 'role',  header: 'Role' },
  { id: 'score', accessorKey: 'score', header: 'Score', sortFn: 'basic' },
]
`

export const EXAMPLES: Record<string, string> = {
  // Data operations — the zero-config grid already sorts, searches and paginates.
  'data-operations': `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      pagination={{ pageSize: 5 }} />
  )
}
`,

  // Columns — pin, reorder and resize from the columns menu.
  columns: `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableColumnPinning enableColumnOrdering showColumnsMenu />
  )
}
`,

  // Rows — checkbox row selection with the selected-count chip.
  rows: `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableRowSelection showSelectionInfo />
  )
}
`,

  // Editing — cell mode; own the data with onDataChange.
  editing: `${HEAD}
const editable: BstTableColumn<Row>[] = columns.map((c) =>
  c.id === 'name' || c.id === 'score'
    ? { ...c, meta: { type: c.id === 'score' ? 'number' : 'text', editable: true } }
    : c,
)
export default function App() {
  const [rows, setRows] = React.useState(seed)
  return (
    <BstTableMui data={rows} columns={editable} getRowId={(r) => r.id}
      enableEditing={{ mode: 'cell' }} onDataChange={setRows} />
  )
}
`,

  // Editing (batch) — every edit is a draft; one onSave for the whole change-set.
  'editing-batch': `${HEAD}
const editable: BstTableColumn<Row>[] = columns.map((c) =>
  c.id === 'name' || c.id === 'score'
    ? { ...c, meta: { type: c.id === 'score' ? 'number' : 'text', editable: true } }
    : c,
)
export default function App() {
  const [rows, setRows] = React.useState(seed)
  return (
    <BstTableMui data={rows} columns={editable} getRowId={(r) => r.id}
      enableEditing={{ mode: 'batch' }} enableBatchEditing showChangesSheet
      onDataChange={setRows}
      onSave={({ rows }) => alert(rows.length + ' row(s) saved in one call')} />
  )
}
`,

  // Selection & clipboard — drag a range, Ctrl/Cmd+C to copy as TSV.
  'selection-clipboard': `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableCellSelection enableClipboard showStatusBar />
  )
}
`,

  // Display — a live status bar with sum / avg / min / max of the selected range.
  display: `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableCellSelection showStatusBar showDensityToggle />
  )
}
`,

  // Performance — 500 rows, virtualized so only the visible ones render.
  performance: `${HEAD}
const many: Row[] = Array.from({ length: 500 }, (_, i) => ({
  ...seed[i % seed.length], id: String(i + 1), score: 60 + (i % 40),
}))
export default function App() {
  return (
    <BstTableMui data={many} columns={columns} getRowId={(r) => r.id}
      enableVirtualization={{ overscan: 8 }} pagination={false} />
  )
}
`,

  // Export — CSV / Excel / print from the toolbar menu.
  export: `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableExport showExport />
  )
}
`,

  // Toolbar & chrome — the runtime settings sheet (gear) flips features per table.
  'toolbar-chrome': `${HEAD}
export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      showSettings enableColumnPinning enableRowSelection />
  )
}
`,

  // Cell-type showcase — sparkline · KPI · single/multi-select badges · boolean.
  showcase: `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Product = {
  id: string; name: string; trend: number[]
  revenue: { value: number; delta: number; data: number[] }
  status: string; tags: string[]; active: boolean
}
const data: Product[] = [
  { id: '1', name: 'Nimbus',  trend: [3,5,4,6,7,6,9], revenue: { value: 42000, delta: 12, data: [30,34,38,42] }, status: 'live', tags: ['api','pro'],       active: true  },
  { id: '2', name: 'Stratus', trend: [8,7,7,5,4,4,3], revenue: { value: 18500, delta: -8, data: [24,22,20,18] }, status: 'beta', tags: ['api'],             active: true  },
  { id: '3', name: 'Cirrus',  trend: [2,3,3,4,5,7,8], revenue: { value: 63200, delta: 21, data: [40,48,55,63] }, status: 'live', tags: ['api','pro','new'], active: false },
  { id: '4', name: 'Cumulus', trend: [5,5,6,6,5,5,6], revenue: { value: 9800,  delta: 3,  data: [9,9,10,10]  },  status: 'off',  tags: ['new'],             active: false },
]
const columns: BstTableColumn<Product>[] = [
  { id: 'name', accessorKey: 'name', header: 'Product' },
  { id: 'trend', accessorKey: 'trend', header: '7-day', meta: { type: 'sparkline', cellMeta: { variant: 'area' } } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Revenue', meta: { type: 'kpi', cellMeta: { currency: 'USD', deltaPercent: true } } },
  { id: 'status', accessorKey: 'status', header: 'Status', meta: { type: 'singleSelect', options: [
    { value: 'live', label: 'Live', color: '#22c55e' },
    { value: 'beta', label: 'Beta', color: '#f59e0b' },
    { value: 'off',  label: 'Offline', color: '#94a3b8' },
  ] } },
  { id: 'tags', accessorKey: 'tags', header: 'Tags', meta: { type: 'multiSelect', options: [
    { value: 'api', label: 'API', color: '#3b82f6' },
    { value: 'pro', label: 'Pro', color: '#a855f7' },
    { value: 'new', label: 'New', color: '#10b981' },
  ] } },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean', align: 'center' } },
]
export default function App() {
  return <BstTableMui data={data} columns={columns} getRowId={(r) => r.id} />
}
`,

  // Dark mode — the MUI skin follows your ThemeProvider palette.
  dark: `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

type Row = { id: string; name: string; team: string; role: string; score: number }
const seed: Row[] = [
  { id: '1', name: 'Ada Lovelace',    team: 'Platform', role: 'Engineer',  score: 92 },
  { id: '2', name: 'Alan Turing',     team: 'Research', role: 'Scientist', score: 88 },
  { id: '3', name: 'Grace Hopper',    team: 'Platform', role: 'Engineer',  score: 95 },
  { id: '4', name: 'Katherine J.',    team: 'Research', role: 'Analyst',   score: 90 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'team', accessorKey: 'team', header: 'Team' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'score', accessorKey: 'score', header: 'Score', sortFn: 'basic' },
]
export default function App() {
  return (
    <ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
      <CssBaseline />
      <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id} pagination={{ pageSize: 5 }} />
    </ThemeProvider>
  )
}
`,
}

// ---- per-cell-type demos — a small 2-column grid per cell type -------------
// Each renders `Item` + one column of the given `meta.type` with correct data.
const CELL_DEMO_DATA: Record<string, { rows: string; col: string }> = {
  text:         { rows: `[{ id:'1', item:'Widget A', v:'In stock' }, { id:'2', item:'Widget B', v:'Backorder' }]`, col: `{ id:'v', accessorKey:'v', header:'Text', meta:{ type:'text' } }` },
  longText:     { rows: `[{ id:'1', item:'Note', v:'A longer note that wraps across the cell when there is room, or truncates with a tooltip.' }, { id:'2', item:'Short', v:'Brief.' }]`, col: `{ id:'v', accessorKey:'v', header:'Long text', meta:{ type:'longText' } }` },
  number:       { rows: `[{ id:'1', item:'Revenue', v:1234.5 }, { id:'2', item:'Units', v:89 }]`, col: `{ id:'v', accessorKey:'v', header:'Number', meta:{ type:'number', cellMeta:{ currency:'USD', precision:2 } } }` },
  dateTime:     { rows: `[{ id:'1', item:'Created', v:'2026-08-24' }, { id:'2', item:'Updated', v:'2026-01-05' }]`, col: `{ id:'v', accessorKey:'v', header:'Date', meta:{ type:'dateTime', cellMeta:{ variant:'date' } } }` },
  boolean:      { rows: `[{ id:'1', item:'Active', v:true }, { id:'2', item:'Archived', v:false }]`, col: `{ id:'v', accessorKey:'v', header:'Boolean', meta:{ type:'boolean' } }` },
  singleSelect: { rows: `[{ id:'1', item:'Acme', v:'active' }, { id:'2', item:'Globex', v:'churned' }]`, col: `{ id:'v', accessorKey:'v', header:'Status', meta:{ type:'singleSelect', options:[{ value:'active', label:'Active', color:'#22c55e' }, { value:'churned', label:'Churned', color:'#ef4444' }] } }` },
  multiSelect:  { rows: `[{ id:'1', item:'Nimbus', v:['api','pro'] }, { id:'2', item:'Cirrus', v:['new'] }]`, col: `{ id:'v', accessorKey:'v', header:'Tags', meta:{ type:'multiSelect', options:[{ value:'api', label:'API', color:'#3b82f6' }, { value:'pro', label:'Pro', color:'#a855f7' }, { value:'new', label:'New', color:'#10b981' }] } }` },
  radio:        { rows: `[{ id:'1', item:'Q1', v:'yes' }, { id:'2', item:'Q2', v:'no' }]`, col: `{ id:'v', accessorKey:'v', header:'Radio', meta:{ type:'radio', options:[{ value:'yes', label:'Yes' }, { value:'no', label:'No' }] } }` },
  hyperlink:    { rows: `[{ id:'1', item:'Docs', v:'https://bst-grid.pages.dev' }, { id:'2', item:'Repo', v:'https://example.com' }]`, col: `{ id:'v', accessorKey:'v', header:'Link', meta:{ type:'hyperlink' } }` },
  files:        { rows: `[{ id:'1', item:'Spec', v:[{ name:'spec.pdf', url:'#' }] }, { id:'2', item:'Logo', v:[{ name:'logo.png', url:'#' }] }]`, col: `{ id:'v', accessorKey:'v', header:'Files', meta:{ type:'files' } }` },
  sparkline:    { rows: `[{ id:'1', item:'Nimbus', v:[3,5,4,6,7,9] }, { id:'2', item:'Stratus', v:[8,6,7,5,4,3] }]`, col: `{ id:'v', accessorKey:'v', header:'Trend', meta:{ type:'sparkline', cellMeta:{ variant:'area' } } }` },
  kpi:          { rows: `[{ id:'1', item:'MRR', v:{ value:42000, delta:12 } }, { id:'2', item:'Churn', v:{ value:9800, delta:-4 } }]`, col: `{ id:'v', accessorKey:'v', header:'KPI', meta:{ type:'kpi', cellMeta:{ deltaPercent:true } } }` },
  qr:           { rows: `[{ id:'1', item:'Docs', v:'https://bst-grid.pages.dev' }, { id:'2', item:'SKU', v:'BST-2026' }]`, col: `{ id:'v', accessorKey:'v', header:'QR', meta:{ type:'qr' } }` },
  barcode:      { rows: `[{ id:'1', item:'Nimbus', v:'NB-1001' }, { id:'2', item:'Stratus', v:'ST-2043' }]`, col: `{ id:'v', accessorKey:'v', header:'Barcode', meta:{ type:'barcode', cellMeta:{ height:44 } } }` },
  richText:     { rows: `[{ id:'1', item:'Formatted', v:'<b>Bold</b> and <i>italic</i>' }, { id:'2', item:'Plain', v:'Plain text' }]`, col: `{ id:'v', accessorKey:'v', header:'Rich text', meta:{ type:'richText', cellMeta:{ render:'html' } } }` },
}
function cellDemo(d: { rows: string; col: string }): string {
  return `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
const rows = ${d.rows}
const columns: BstTableColumn<any>[] = [
  { id: 'item', accessorKey: 'item', header: 'Item' },
  ${d.col},
]
export default function App() {
  return <BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} pagination={false} />
}
`
}
for (const [t, d] of Object.entries(CELL_DEMO_DATA)) EXAMPLES['cell-' + t] = cellDemo(d)

// ---- distinct-feature demos ------------------------------------------------
const FEAT_HEAD = `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
type Row = { id: string; name: string; team: string; role: string; score: number }
const seed: Row[] = [
  { id: '1', name: 'Ada Lovelace',    team: 'Platform', role: 'Engineer',  score: 92 },
  { id: '2', name: 'Alan Turing',     team: 'Research', role: 'Scientist', score: 88 },
  { id: '3', name: 'Grace Hopper',    team: 'Platform', role: 'Engineer',  score: 95 },
  { id: '4', name: 'Katherine J.',    team: 'Research', role: 'Analyst',   score: 90 },
  { id: '5', name: 'Edsger Dijkstra', team: 'Platform', role: 'Architect', score: 84 },
]
const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'team', accessorKey: 'team', header: 'Team' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'score', accessorKey: 'score', header: 'Score', sortFn: 'basic' },
]
`

EXAMPLES['feat-conditional'] = `import React from 'react'
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
type Deal = { id: string; company: string; amount: number; stage: string; daysOpen: number }
const data: Deal[] = [
  { id: '1', company: 'Acme Corp', amount: 82000, stage: 'Won',        daysOpen: 12 },
  { id: '2', company: 'Globex',    amount: 14500, stage: 'Negotiation', daysOpen: 41 },
  { id: '3', company: 'Initech',   amount: 56000, stage: 'Proposal',    daysOpen: 8 },
  { id: '4', company: 'Umbrella',  amount: 4200,  stage: 'Lost',        daysOpen: 63 },
  { id: '5', company: 'Soylent',   amount: 71000, stage: 'Won',        daysOpen: 5 },
]
const columns: BstTableColumn<Deal>[] = [
  { id: 'company', accessorKey: 'company', header: 'Company' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount', meta: { type: 'number', cellMeta: { currency: 'USD' } } },
  { id: 'stage', accessorKey: 'stage', header: 'Stage' },
  { id: 'daysOpen', accessorKey: 'daysOpen', header: 'Days open', meta: { type: 'number' } },
]
export default function App() {
  return (
    <BstTableMui data={data} columns={columns} getRowId={(r) => r.id} pagination={false}
      conditionalFormats={[
        { scope: 'cell', columnId: 'amount', when: { op: 'gt', value: 50000 }, style: { color: '#16a34a', fontWeight: 700 } },
        { scope: 'row', columnId: 'daysOpen', when: { op: 'gt', value: 30 }, style: { background: '#fef2f2' } },
        { scope: 'row', columnId: 'stage', when: { op: 'equals', value: 'Won' }, style: { background: '#f0fdf4' } },
      ]} />
  )
}
`

EXAMPLES['feat-master'] = FEAT_HEAD + `export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableExpanding getRowCanExpand={() => true}
      renderDetail={(row) => (
        <div style={{ padding: 14, background: '#f8fafc' }}>
          Detail for <b>{row.original.name}</b> — {row.original.role} on the {row.original.team} team, score {row.original.score}.
        </div>
      )} />
  )
}
`

EXAMPLES['feat-grouping'] = FEAT_HEAD + `export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      enableGrouping initialState={{ grouping: ['team'], expanded: true }} />
  )
}
`

EXAMPLES['feat-filterbuilder'] = FEAT_HEAD + `export default function App() {
  return (
    <BstTableMui data={seed} columns={columns} getRowId={(r) => r.id}
      showFilterBuilder enableColumnFilterRow />
  )
}
`

EXAMPLES['feat-undoredo'] = FEAT_HEAD + `const editable = columns.map((c) => c.id === 'score' ? { ...c, meta: { type: 'number', editable: true } } : c)
export default function App() {
  const [rows, setRows] = React.useState(seed)
  return (
    <BstTableMui data={rows} columns={editable} getRowId={(r) => r.id}
      enableEditing enableUndoRedo showUndoRedo onDataChange={setRows} />
  )
}
`

EXAMPLES['feat-rowactions'] = FEAT_HEAD + `const withAction: BstTableColumn<Row>[] = [...columns, { id: 'actions', accessorKey: 'id', header: 'Actions', meta: { type: 'action' } }]
export default function App() {
  const [rows, setRows] = React.useState(seed)
  return (
    <BstTableMui data={rows} columns={withAction} getRowId={(r) => r.id}
      enableEditing enableRowActions showAddRow onDataChange={setRows} />
  )
}
`
