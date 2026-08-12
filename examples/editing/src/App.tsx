import * as React from 'react'
import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Task = { id: string; title: string; points: number | null; status: string; done: boolean }

const seed: Task[] = [
  { id: '1', title: 'Design the column API', points: 5, status: 'done', done: true },
  { id: '2', title: 'Ship the editing feature', points: 8, status: 'wip', done: false },
  { id: '3', title: 'Write the docs', points: 3, status: 'todo', done: false },
  { id: '4', title: 'Add cell types', points: 13, status: 'wip', done: false },
]

const columns: BstTableColumn<Task>[] = [
  {
    id: 'title', accessorKey: 'title', header: 'Title',
    meta: { type: 'text', editable: true, cellMeta: { required: true } }, // required → validated
  },
  {
    id: 'points', accessorKey: 'points', header: 'Points',
    meta: { type: 'number', editable: true, align: 'right' },
  },
  {
    id: 'status', accessorKey: 'status', header: 'Status',
    meta: {
      type: 'singleSelect', editable: true,
      options: [
        { value: 'todo', label: 'To do', color: '#94a3b8' },
        { value: 'wip', label: 'In progress', color: '#f59e0b' },
        { value: 'done', label: 'Done', color: '#22c55e' },
      ],
    },
  },
  { id: 'done', accessorKey: 'done', header: 'Done', meta: { type: 'boolean', editable: true } },
  {
    id: 'actions', header: '',
    meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } },
  },
]

export default function App() {
  const [rows, setRows] = React.useState(seed)
  const table = useBstTable<Task>({
    data: rows,
    columns,
    getRowId: (r) => r.id,
    onDataChange: setRows,   // controlled write-back, by rowId
    enableEditing: true,     // double-click a cell to edit
    enableValidation: true,  // Title is required
    enableRowActions: true,  // Edit / Copy / Delete buttons
    createRow: () => ({ title: 'New task', points: 0, status: 'todo', done: false }),
  })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — editing & cell types</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Double-click a cell to edit · <b>Enter</b> saves · <b>Esc</b> cancels · Title can't be empty.
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
