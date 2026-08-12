import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Person = { id: string; name: string; role: string; age: number }

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', role: 'Engineer', age: 36 },
  { id: '2', name: 'Linus Torvalds', role: 'Maintainer', age: 54 },
  { id: '3', name: 'Grace Hopper', role: 'Rear Admiral', age: 79 },
  { id: '4', name: 'Alan Turing', role: 'Researcher', age: 41 },
  { id: '5', name: 'Margaret Hamilton', role: 'Director', age: 51 },
  { id: '6', name: 'Dennis Ritchie', role: 'Engineer', age: 70 },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic', meta: { type: 'number', align: 'right' } },
]

export default function App() {
  // A zero-config grid: sorting + pagination are on by default.
  const table = useBstTable({ data, columns, getRowId: (r) => r.id })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — quick start</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>Click a header to sort.</p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
