import {
  useBstTable,
  BstTable,
  useBstDataSource,
  createClientDataSource,
  type BstTableColumn,
} from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Row = { id: string; name: string; city: string; amount: number }

const CITIES = ['Chennai', 'Berlin', 'Tokyo', 'Austin', 'Nairobi']

// 5,000 rows generated up front. In a real app this lives on your server; here a
// client DataSource stands in so the same wiring runs offline.
const ALL: Row[] = Array.from({ length: 5000 }, (_, i) => ({
  id: String(i + 1),
  name: 'Person ' + (i + 1),
  city: CITIES[i % CITIES.length],
  amount: ((i * 37) % 1000) + 50,
}))

// Swap this for `createServerDataSource(async (query, signal) => fetch(...))` to
// run sort / filter / paginate on a real backend — the grid code stays identical.
const source = createClientDataSource(ALL)

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'city', accessorKey: 'city', header: 'City' },
  {
    id: 'amount', accessorKey: 'amount', header: 'Amount', sortFn: 'basic',
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD' } },
  },
]

export default function App() {
  const ds = useBstDataSource(source, { pageSize: 25 })
  const table = useBstTable<Row>({
    columns,
    getRowId: (r) => r.id,
    ...ds.tableProps, // manual sort/filter/paginate + the current page's `data`
  })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 760 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — server mode</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        5,000 rows · sort/paginate run through the DataSource (not in the grid).{' '}
        {ds.loading ? 'Loading…' : `${ds.totalCount} rows`}
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
