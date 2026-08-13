import {
  useBstTable,
  BstTable,
  verhoeffChecksum,
  gstinCheckDigit,
  type BstTableColumn,
} from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'
import * as React from 'react'

// ERP "field formats" (Frappe-style) put validation + an input mask on a plain
// text / number cell via `cellMeta.pattern` — no per-column validator needed.

type Vendor = {
  id: string
  name: string
  pan: string
  aadhaar: number | null
  gstin: string
  ifsc: string
  email: string
  phone: string
  iban: string
  card: string
}

// Seed values are built VALID via the exported checksum helpers, so the grid
// loads clean. Edit any cell to an invalid value to watch its format reject it.
const aadhaar = (body11: string) => Number(body11 + verhoeffChecksum(body11))
const gstin = (first14: string) => first14 + gstinCheckDigit(first14)

const seed: Vendor[] = [
  {
    id: 'v1', name: 'Acme Traders', pan: 'AAPFU0939F', aadhaar: aadhaar('23456789012'),
    gstin: gstin('27AAPFU0939F1Z'), ifsc: 'HDFC0001234', email: 'accounts@acme.io',
    phone: '9876543210', iban: 'DE89370400440532013000', card: '4111111111111111',
  },
  {
    id: 'v2', name: 'Bharat Supplies', pan: 'BCDPK1432M', aadhaar: aadhaar('34567890121'),
    gstin: gstin('29BCDPK1432M1Z'), ifsc: 'ICIC0004567', email: 'gst@bharat.co',
    phone: '9812345678', iban: 'GB29NWBK60161331926819', card: '5500005555555559',
  },
]

// Each column is a normal text/number cell + one line: `cellMeta: { pattern }`.
const columns: BstTableColumn<Vendor>[] = [
  { id: 'name', accessorKey: 'name', header: 'Vendor', meta: { type: 'text', editable: true, cellMeta: { required: true } } },
  { id: 'pan', accessorKey: 'pan', header: 'PAN', meta: { type: 'text', editable: true, cellMeta: { pattern: 'pan' } } },
  { id: 'aadhaar', accessorKey: 'aadhaar', header: 'Aadhaar', meta: { type: 'number', editable: true, align: 'left', cellMeta: { pattern: 'aadhaar' } } },
  { id: 'gstin', accessorKey: 'gstin', header: 'GSTIN', meta: { type: 'text', editable: true, cellMeta: { pattern: 'gstin' } } },
  { id: 'ifsc', accessorKey: 'ifsc', header: 'IFSC', meta: { type: 'text', editable: true, cellMeta: { pattern: 'ifsc' } } },
  { id: 'email', accessorKey: 'email', header: 'Email', meta: { type: 'text', editable: true, cellMeta: { pattern: 'email' } } },
  { id: 'phone', accessorKey: 'phone', header: 'Mobile', meta: { type: 'text', editable: true, cellMeta: { pattern: 'phone' } } },
  { id: 'iban', accessorKey: 'iban', header: 'IBAN', meta: { type: 'text', editable: true, cellMeta: { pattern: 'iban' } } },
  { id: 'card', accessorKey: 'card', header: 'Card', meta: { type: 'text', editable: true, cellMeta: { pattern: 'creditCard' } } },
]

export default function App() {
  const [data, setData] = React.useState<Vendor[]>(seed)
  const table = useBstTable<Vendor>({
    data,
    columns,
    getRowId: (r) => r.id,
    enableEditing: true,
    enableValidation: true,
    onDataChange: setData,
  })
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24, maxWidth: 1040 }}>
      <h1 style={{ fontSize: 20, marginBottom: 4 }}>Bst-Table — ERP field formats</h1>
      <p style={{ color: '#64748b', marginTop: 0, lineHeight: 1.5 }}>
        Frappe-style validation + input masks via <code>cellMeta.pattern</code>. Double-click a cell
        and type an invalid <b>PAN</b>, <b>Aadhaar</b>, <b>GSTIN</b>, <b>IBAN</b> or <b>card</b> to
        see it blocked with a message; valid values are masked on read (Aadhaar → <code>1234 5678
        9012</code>, card grouped). Real checksums: Aadhaar (Verhoeff), GSTIN (mod-36), IBAN
        (mod-97), card (Luhn). Built-ins also include <code>tan · passport · iec · esic · pf · swift ·
        pincode · url · upi</code>.
      </p>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </main>
  )
}
