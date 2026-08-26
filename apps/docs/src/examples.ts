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
}
