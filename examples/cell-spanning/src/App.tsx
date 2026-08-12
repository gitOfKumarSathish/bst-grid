import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Row = { id: string; region: string; country: string; city: string; sales: number }

// Rows are ordered by region → country (contiguous), so `rowSpan: 'group'` merges
// the repeated Region and Country cells into one tall cell each.
const data: Row[] = [
  { id: '1', region: 'APAC', country: 'Japan', city: 'Tokyo', sales: 120 },
  { id: '2', region: 'APAC', country: 'Japan', city: 'Osaka', sales: 64 },
  { id: '3', region: 'APAC', country: 'India', city: 'Chennai', sales: 88 },
  { id: '4', region: 'APAC', country: 'India', city: 'Mumbai', sales: 96 },
  { id: '5', region: 'EMEA', country: 'Germany', city: 'Berlin', sales: 110 },
  { id: '6', region: 'EMEA', country: 'Germany', city: 'Munich', sales: 72 },
  { id: '7', region: 'EMEA', country: 'France', city: 'Paris', sales: 130 },
]

const columns: BstTableColumn<Row>[] = [
  { id: 'region', accessorKey: 'region', header: 'Region', meta: { type: 'text', rowSpan: 'group' } },
  { id: 'country', accessorKey: 'country', header: 'Country', meta: { type: 'text', rowSpan: 'group' } },
  { id: 'city', accessorKey: 'city', header: 'City' },
  { id: 'sales', accessorKey: 'sales', header: 'Sales (k)', meta: { type: 'number', align: 'right' } },
]

export default function App() {
  const table = useBstTable<Row>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableCellSpanning: true,
    pagination: false,
  })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 620 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — cell spanning</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        <code>meta.rowSpan: 'group'</code> merges consecutive equal values — Region and Country span their rows.
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
