import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Deal = { id: string; company: string; amount: number; stage: string; daysOpen: number }

const data: Deal[] = [
  { id: '1', company: 'Acme Corp', amount: 82000, stage: 'Won', daysOpen: 12 },
  { id: '2', company: 'Globex', amount: 14500, stage: 'Negotiation', daysOpen: 41 },
  { id: '3', company: 'Initech', amount: 56000, stage: 'Proposal', daysOpen: 8 },
  { id: '4', company: 'Umbrella', amount: 4200, stage: 'Lost', daysOpen: 63 },
  { id: '5', company: 'Soylent', amount: 71000, stage: 'Won', daysOpen: 5 },
  { id: '6', company: 'Hooli', amount: 9800, stage: 'Negotiation', daysOpen: 34 },
]

const columns: BstTableColumn<Deal>[] = [
  { id: 'company', accessorKey: 'company', header: 'Company' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount', meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD' } } },
  { id: 'stage', accessorKey: 'stage', header: 'Stage' },
  { id: 'daysOpen', accessorKey: 'daysOpen', header: 'Days open', meta: { type: 'number', align: 'right' } },
]

export default function App() {
  const table = useBstTable<Deal>({
    data,
    columns,
    getRowId: (r) => r.id,
    pagination: false,
    // Declarative rules → cell/row class + style. Operators are the E3 filter ops.
    conditionalFormats: [
      // Big deals: bold green amount cell.
      { scope: 'cell', columnId: 'amount', when: { op: 'gt', value: 50000 }, style: { color: '#16a34a', fontWeight: 700 } },
      // Stalled (> 30 days open): red-tinted row.
      { scope: 'row', columnId: 'daysOpen', when: { op: 'gt', value: 30 }, style: { background: '#fef2f2' } },
      // Won deals: green-tinted row.
      { scope: 'row', columnId: 'stage', when: { op: 'equals', value: 'Won' }, style: { background: '#f0fdf4' } },
    ],
  })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 720 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — conditional formatting</h1>
      <p style={{ color: '#64748b', marginTop: 0 }}>
        Big amounts turn green · stalled deals (&gt;30 days) go red · won deals go green — all from <code>conditionalFormats</code> rules.
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
