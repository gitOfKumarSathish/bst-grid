import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Product = {
  id: string
  name: string
  trend: number[]
  revenue: { value: number; delta: number; data: number[] }
  status: string
  tags: string[]
  active: boolean
  site: string
  sku: string
}

const data: Product[] = [
  { id: '1', name: 'Nimbus', trend: [3, 5, 4, 6, 7, 6, 9], revenue: { value: 42000, delta: 12, data: [30, 34, 38, 42] }, status: 'live', tags: ['api', 'pro'], active: true, site: 'https://example.com/nimbus', sku: 'NB-1001' },
  { id: '2', name: 'Stratus', trend: [8, 7, 7, 5, 4, 4, 3], revenue: { value: 18500, delta: -8, data: [24, 22, 20, 18] }, status: 'beta', tags: ['api'], active: true, site: 'https://example.com/stratus', sku: 'ST-2043' },
  { id: '3', name: 'Cirrus', trend: [2, 3, 3, 4, 5, 7, 8], revenue: { value: 63200, delta: 21, data: [40, 48, 55, 63] }, status: 'live', tags: ['api', 'pro', 'new'], active: false, site: 'https://example.com/cirrus', sku: 'CR-3099' },
  { id: '4', name: 'Cumulus', trend: [5, 5, 6, 6, 5, 5, 6], revenue: { value: 9800, delta: 3, data: [9, 9, 10, 10] }, status: 'off', tags: ['new'], active: false, site: 'https://example.com/cumulus', sku: 'CU-4012' },
]

// Each column picks a renderer via `meta.type` — all dependency-free inline SVG / DOM.
const columns: BstTableColumn<Product>[] = [
  { id: 'name', accessorKey: 'name', header: 'Product' },
  { id: 'trend', accessorKey: 'trend', header: '7-day', meta: { type: 'sparkline', cellMeta: { variant: 'area' } } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Revenue', meta: { type: 'kpi', cellMeta: { currency: 'USD', deltaPercent: true } } },
  {
    id: 'status', accessorKey: 'status', header: 'Status',
    meta: {
      type: 'singleSelect',
      options: [
        { value: 'live', label: 'Live', color: '#22c55e' },
        { value: 'beta', label: 'Beta', color: '#f59e0b' },
        { value: 'off', label: 'Offline', color: '#94a3b8' },
      ],
    },
  },
  {
    id: 'tags', accessorKey: 'tags', header: 'Tags',
    meta: {
      type: 'multiSelect',
      options: [
        { value: 'api', label: 'API', color: '#3b82f6' },
        { value: 'pro', label: 'Pro', color: '#a855f7' },
        { value: 'new', label: 'New', color: '#10b981' },
      ],
    },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean', align: 'center' } },
  { id: 'site', accessorKey: 'site', header: 'Site', meta: { type: 'hyperlink' } },
  { id: 'sku', accessorKey: 'sku', header: 'Barcode', meta: { type: 'barcode', cellMeta: { height: 30 } } },
]

export default function App() {
  const table = useBstTable<Product>({ data, columns, getRowId: (r) => r.id, pagination: false })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 940 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — cell types</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        sparkline · KPI · single-select · multi-select · boolean · hyperlink · barcode — one <code>meta.type</code> each, no charting library.
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
