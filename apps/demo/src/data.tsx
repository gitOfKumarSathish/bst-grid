import type { BstTableColumn, FieldError } from '@bloomskill/table-engine'
import { verhoeffChecksum, gstinCheckDigit } from '@bloomskill/table-engine'

export type Person = {
  id: string
  name: string
  email: string
  age: number | null
  salary: number | null
  joined: string | null
  active: boolean
  role: string | null
  skills: string[]
  plan: string | null
  website: string
  bio: string
  files: { name: string; contentType?: string; url?: string }[]
}

export const people: Person[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@acme.io', age: 34, salary: 120000, joined: '2023-02-11', active: true, role: 'admin', skills: ['react', 'ts', 'node'], plan: 'pro', website: 'https://alice.dev', bio: 'Platform lead. Loves DX and fast grids.', files: [{ name: 'contract.pdf' }] },
  { id: '2', name: 'Bob Smith', email: 'bob@acme.io', age: 28, salary: 90000, joined: '2024-06-01', active: false, role: 'editor', skills: ['css', 'react'], plan: 'free', website: 'https://bob.io', bio: 'Frontend engineer.', files: [] },
  { id: '3', name: 'Carla Diaz', email: 'carla@acme.io', age: 41, salary: 135000, joined: '2022-11-23', active: true, role: 'viewer', skills: ['sql'], plan: 'ent', website: 'https://carla.example', bio: 'Data analyst.', files: [{ name: 'avatar.png' }] },
  { id: '4', name: 'David Lee', email: 'david@acme.io', age: 37, salary: 110000, joined: '2021-09-15', active: false, role: 'editor', skills: ['node', 'sql', 'ts'], plan: 'pro', website: 'https://dlee.dev', bio: 'Backend.', files: [] },
  { id: '5', name: 'Ella Fitz', email: 'ella@acme.io', age: 30, salary: 98000, joined: '2024-01-08', active: true, role: 'admin', skills: ['react', 'css'], plan: 'free', website: 'https://ella.design', bio: 'Design systems.', files: [] },
  { id: '6', name: 'Frank Ocean', email: 'frank@acme.io', age: 45, salary: 150000, joined: '2020-05-30', active: true, role: 'viewer', skills: ['ts'], plan: 'ent', website: 'https://frank.fm', bio: 'Music + code.', files: [] },
  { id: '7', name: 'Grace Hopper', email: 'grace@acme.io', age: 52, salary: 180000, joined: '2019-03-19', active: true, role: 'admin', skills: ['node', 'sql'], plan: 'pro', website: 'https://grace.navy', bio: 'Compiler pioneer.', files: [{ name: 'talk.pdf' }] },
  { id: '8', name: 'Hiro Tanaka', email: 'hiro@acme.io', age: 26, salary: 82000, joined: '2024-08-02', active: false, role: 'editor', skills: ['react', 'ts', 'css', 'node'], plan: 'free', website: 'https://hiro.jp', bio: 'Fullstack.', files: [] },
  { id: '9', name: 'Ivy Chen', email: 'ivy@acme.io', age: 33, salary: 105000, joined: '2023-12-12', active: true, role: 'viewer', skills: ['sql', 'ts'], plan: 'pro', website: 'https://ivy.dev', bio: 'BI + dashboards.', files: [] },
  { id: '10', name: 'Jack Ma', email: 'jack@acme.io', age: 39, salary: 125000, joined: '2022-07-07', active: false, role: 'editor', skills: ['node'], plan: 'ent', website: 'https://jack.biz', bio: 'Commerce.', files: [] },
  { id: '11', name: 'Kira Nyx', email: 'kira@acme.io', age: 29, salary: 99000, joined: '2024-03-21', active: true, role: 'viewer', skills: ['react'], plan: 'free', website: 'https://kira.gg', bio: 'Games.', files: [] },
  { id: '12', name: 'Liam Park', email: 'liam@acme.io', age: 47, salary: 160000, joined: '2021-01-05', active: true, role: 'admin', skills: ['ts', 'node', 'sql', 'react'], plan: 'pro', website: 'https://liam.kr', bio: 'Eng manager.', files: [] },
]

/** Async validator demo: pretend this email is already taken (resolves after 600ms). */
const takenEmails = new Set(['taken@acme.io'])
function emailNotTaken(value: unknown): Promise<FieldError[]> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve(
          takenEmails.has(String(value ?? '').toLowerCase())
            ? [{ level: 'error', message: 'Email already taken', code: 'taken' }]
            : [],
        ),
      600,
    ),
  )
}

/**
 * ONE column set fed to BOTH adapters. Every column declares a Phase-2 cell type
 * via `meta.type` and opts into editing with `meta.editable`. This is the whole
 * B-series + editing + validation in one place.
 */
export const columns: BstTableColumn<Person>[] = [
  {
    id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric', size: 150,
    meta: { type: 'text', editable: true, cellMeta: { required: true } },
  },
  {
    id: 'email', accessorKey: 'email', header: 'Email (async)', size: 200,
    meta: { type: 'text', editable: true, cellMeta: { required: true }, validate: emailNotTaken },
  },
  {
    id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic', size: 90,
    meta: {
      type: 'number', editable: true, align: 'right', cellMeta: { required: true },
      validate: (v: unknown) =>
        typeof v === 'number' && v < 18
          ? [{ level: 'error', message: 'Must be 18 or older', code: 'min' }]
          : [],
    },
  },
  {
    id: 'salary', accessorKey: 'salary', header: 'Salary', sortFn: 'basic', size: 120,
    meta: { type: 'number', editable: true, align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
  {
    id: 'joined', accessorKey: 'joined', header: 'Joined', sortFn: 'datetime', size: 140,
    meta: { type: 'dateTime', editable: true, cellMeta: { variant: 'date' } },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', size: 90, meta: { type: 'boolean', editable: true } },
  {
    id: 'role', accessorKey: 'role', header: 'Role', sortFn: 'alphanumeric', size: 130,
    meta: {
      type: 'singleSelect', editable: true,
      options: [
        { value: 'admin', label: 'Admin', color: '#ef4444' },
        { value: 'editor', label: 'Editor', color: '#f59e0b' },
        { value: 'viewer', label: 'Viewer', color: '#22c55e' },
      ],
    },
  },
  {
    id: 'skills', accessorKey: 'skills', header: 'Skills', size: 190,
    meta: {
      // Width-aware chips (B7): as many as the column width fits, rest → "+N more".
      // Drag the Skills column wider/narrower to watch them fold in and out.
      type: 'multiSelect', editable: true, cellMeta: { fitChips: true },
      options: [
        { value: 'react', label: 'React' },
        { value: 'ts', label: 'TypeScript' },
        { value: 'node', label: 'Node' },
        { value: 'css', label: 'CSS' },
        { value: 'sql', label: 'SQL' },
      ],
    },
  },
  {
    id: 'plan', accessorKey: 'plan', header: 'Plan', size: 210,
    meta: {
      type: 'radio', editable: true, cellMeta: { layout: 'horizontal' },
      options: [
        { value: 'free', label: 'Free' },
        { value: 'pro', label: 'Pro' },
        { value: 'ent', label: 'Enterprise' },
      ],
    },
  },
  { id: 'website', accessorKey: 'website', header: 'Website', size: 170, meta: { type: 'hyperlink', editable: true } },
  { id: 'bio', accessorKey: 'bio', header: 'Bio (popup)', size: 170, meta: { type: 'longText', editable: true } },
  { id: 'files', accessorKey: 'files', header: 'Files (popup)', size: 150, meta: { type: 'files', editable: true } },
  {
    id: 'actions', header: '', size: 190, enableSorting: false,
    meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } },
  },
]

/** A blank row for the "Add row" button. */
export const newPerson = (): Partial<Person> => ({
  name: '', email: '', age: null, salary: null, joined: null, active: false,
  role: null, skills: [], plan: null, website: '', bio: '', files: [],
})

/**
 * Master-detail with a NESTED TABLE (A4) — a little database catalog.
 * Each outer row is a table; expanding it renders the table's column
 * metadata as a full nested Bst-Table (its own header row + value rows).
 */
export type DbField = {
  id: string
  column: string
  type: string
  nullable: boolean
  default: string | null
  pk: boolean
}

export type DbTable = {
  id: string
  name: string
  schema: string
  rowCount: number
  sizeMb: number
  updated: string
  fields: DbField[]
}

export const dbTables: DbTable[] = [
  {
    id: 'users', name: 'users', schema: 'public', rowCount: 48210, sizeMb: 62.4, updated: '2026-08-10',
    fields: [
      { id: 'u1', column: 'id', type: 'uuid', nullable: false, default: 'gen_random_uuid()', pk: true },
      { id: 'u2', column: 'email', type: 'varchar(255)', nullable: false, default: null, pk: false },
      { id: 'u3', column: 'name', type: 'text', nullable: true, default: null, pk: false },
      { id: 'u4', column: 'created_at', type: 'timestamptz', nullable: false, default: 'now()', pk: false },
    ],
  },
  {
    id: 'orders', name: 'orders', schema: 'public', rowCount: 391402, sizeMb: 512.8, updated: '2026-08-12',
    fields: [
      { id: 'o1', column: 'id', type: 'bigint', nullable: false, default: 'identity', pk: true },
      { id: 'o2', column: 'user_id', type: 'uuid', nullable: false, default: null, pk: false },
      { id: 'o3', column: 'status', type: 'order_status', nullable: false, default: "'pending'", pk: false },
      { id: 'o4', column: 'total_cents', type: 'integer', nullable: false, default: '0', pk: false },
      { id: 'o5', column: 'placed_at', type: 'timestamptz', nullable: false, default: 'now()', pk: false },
    ],
  },
  {
    id: 'order_items', name: 'order_items', schema: 'public', rowCount: 1204993, sizeMb: 890.1, updated: '2026-08-12',
    fields: [
      { id: 'i1', column: 'order_id', type: 'bigint', nullable: false, default: null, pk: true },
      { id: 'i2', column: 'sku', type: 'varchar(64)', nullable: false, default: null, pk: true },
      { id: 'i3', column: 'qty', type: 'smallint', nullable: false, default: '1', pk: false },
      { id: 'i4', column: 'unit_price_cents', type: 'integer', nullable: false, default: null, pk: false },
    ],
  },
  {
    id: 'audit_log', name: 'audit_log', schema: 'ops', rowCount: 9822011, sizeMb: 4123.5, updated: '2026-08-12',
    fields: [
      { id: 'a1', column: 'id', type: 'bigint', nullable: false, default: 'identity', pk: true },
      { id: 'a2', column: 'actor', type: 'text', nullable: true, default: null, pk: false },
      { id: 'a3', column: 'action', type: 'text', nullable: false, default: null, pk: false },
      { id: 'a4', column: 'payload', type: 'jsonb', nullable: true, default: null, pk: false },
      { id: 'a5', column: 'at', type: 'timestamptz', nullable: false, default: 'now()', pk: false },
    ],
  },
]

/** Outer (master) columns — the catalog itself. */
export const dbTableColumns: BstTableColumn<DbTable>[] = [
  { id: 'name', accessorKey: 'name', header: 'Table', size: 150, meta: { type: 'text' } },
  { id: 'schema', accessorKey: 'schema', header: 'Schema', size: 110, meta: { type: 'text' } },
  {
    id: 'rowCount', accessorKey: 'rowCount', header: 'Rows', sortFn: 'basic', size: 120,
    meta: { type: 'number', align: 'right', cellMeta: { precision: 0 } },
  },
  {
    id: 'sizeMb', accessorKey: 'sizeMb', header: 'Size (MB)', sortFn: 'basic', size: 120,
    meta: { type: 'number', align: 'right', cellMeta: { precision: 1 } },
  },
  { id: 'updated', accessorKey: 'updated', header: 'Updated', size: 130, meta: { type: 'text' } },
]

/** Inner (detail) columns — the expanded row's metadata gets its OWN header + rows. */
export const dbFieldColumns: BstTableColumn<DbField>[] = [
  { id: 'column', accessorKey: 'column', header: 'Column', size: 160, meta: { type: 'text' } },
  { id: 'type', accessorKey: 'type', header: 'Type', size: 150, meta: { type: 'text' } },
  { id: 'nullable', accessorKey: 'nullable', header: 'Nullable', size: 100, meta: { type: 'boolean' } },
  { id: 'default', accessorKey: 'default', header: 'Default', size: 170, meta: { type: 'text' } },
  { id: 'pk', accessorKey: 'pk', header: 'PK', size: 80, meta: { type: 'boolean' } },
]

/**
 * Server-DataSource demo (Plan.md §5). A larger, **deterministic** register (no
 * per-render randomness) so paging + server-side sort/filter are meaningful:
 * 2,000 rows fed through `createClientDataSource` to stand in for a real server
 * that hands back one page at a time. Salary is spread across the whole set so a
 * sort visibly returns the global max on page 1 — not the max of the loaded page.
 */
const SERVER_FIRST = [
  'Alice', 'Bob', 'Carla', 'David', 'Ella', 'Frank', 'Grace', 'Hiro', 'Ivy', 'Jack',
  'Kira', 'Liam', 'Mona', 'Nate', 'Omar', 'Pia', 'Quinn', 'Rosa', 'Sam', 'Tara',
]
const SERVER_ROLES = ['admin', 'editor', 'viewer']
export const serverPeople: Person[] = Array.from({ length: 2000 }, (_, i) => {
  const base = people[i % people.length]
  const first = SERVER_FIRST[i % SERVER_FIRST.length]
  return {
    ...base,
    id: `s${i + 1}`,
    name: `${first} ${String.fromCharCode(65 + (i % 26))}.`,
    email: `${first.toLowerCase()}${i + 1}@acme.io`,
    salary: 60000 + ((i * 37) % 141) * 1000, // 60k–200k across the whole set
    age: 22 + ((i * 13) % 43),
    role: SERVER_ROLES[i % SERVER_ROLES.length],
    active: i % 3 !== 0,
    joined: `20${18 + (i % 8)}-0${1 + (i % 9)}-15`,
  }
})

/**
 * ERP field formats (B1/B2) — a vendor-KYC grid whose text/number cells carry a
 * `cellMeta.pattern` preset (Aadhaar, PAN, GSTIN, IFSC, …). Seed values are built
 * VALID via the exported checksum helpers so the grid loads clean; edit a cell to
 * an invalid value to see the format's validation + message.
 */
export type ErpVendor = {
  id: string
  name: string
  pan: string
  aadhaar: number | null
  gstin: string
  ifsc: string
  email: string
  phone: string
  pincode: string
  passport: string
  pf: string
  esic: string
  iban: string
  swift: string
  card: string
}
const aadhaarOf = (body11: string) => Number(body11 + verhoeffChecksum(body11))
const gstinOf = (first14: string) => first14 + gstinCheckDigit(first14)
export const erpVendors: ErpVendor[] = [
  { id: 'v1', name: 'Acme Traders', pan: 'AAPFU0939F', aadhaar: aadhaarOf('23456789012'), gstin: gstinOf('27AAPFU0939F1Z'), ifsc: 'HDFC0001234', email: 'accounts@acme.io', phone: '9876543210', pincode: '560001', passport: 'A1234567', pf: '100234567890', esic: '31001234567890123', iban: 'DE89370400440532013000', swift: 'DEUTDEFF', card: '4111111111111111' },
  { id: 'v2', name: 'Bharat Supplies', pan: 'BCDPK1432M', aadhaar: aadhaarOf('34567890121'), gstin: gstinOf('29BCDPK1432M1Z'), ifsc: 'ICIC0004567', email: 'gst@bharat.co', phone: '9812345678', pincode: '110001', passport: 'B7654321', pf: '100987654321', esic: '51009876543210987', iban: 'GB29NWBK60161331926819', swift: 'NWBKGB2L', card: '5500005555555559' },
  { id: 'v3', name: 'Chetan Exports', pan: 'CFGHJ7654P', aadhaar: aadhaarOf('45678901219'), gstin: gstinOf('24CFGHJ7654P1Z'), ifsc: 'SBIN0011223', email: 'exports@chetan.in', phone: '9700011122', pincode: '400001', passport: 'C1122334', pf: '100112233445', esic: '41005566778899001', iban: 'FR1420041010050500013M02606', swift: 'BNPAFRPP', card: '4012888888881881' },
]
export const erpColumns: BstTableColumn<ErpVendor>[] = [
  { id: 'name', accessorKey: 'name', header: 'Vendor', size: 150, meta: { type: 'text', editable: true, cellMeta: { required: true } } },
  { id: 'pan', accessorKey: 'pan', header: 'PAN', size: 120, meta: { type: 'text', editable: true, cellMeta: { pattern: 'pan', required: true } } },
  { id: 'aadhaar', accessorKey: 'aadhaar', header: 'Aadhaar', size: 160, meta: { type: 'number', editable: true, align: 'left', cellMeta: { pattern: 'aadhaar' } } },
  { id: 'gstin', accessorKey: 'gstin', header: 'GSTIN', size: 170, meta: { type: 'text', editable: true, cellMeta: { pattern: 'gstin' } } },
  { id: 'ifsc', accessorKey: 'ifsc', header: 'IFSC', size: 130, meta: { type: 'text', editable: true, cellMeta: { pattern: 'ifsc' } } },
  { id: 'email', accessorKey: 'email', header: 'Email', size: 190, meta: { type: 'text', editable: true, cellMeta: { pattern: 'email' } } },
  { id: 'phone', accessorKey: 'phone', header: 'Mobile', size: 130, meta: { type: 'text', editable: true, cellMeta: { pattern: 'phone' } } },
  { id: 'pincode', accessorKey: 'pincode', header: 'PIN', size: 90, meta: { type: 'text', editable: true, cellMeta: { pattern: 'pincode' } } },
  { id: 'passport', accessorKey: 'passport', header: 'Passport', size: 120, meta: { type: 'text', editable: true, cellMeta: { pattern: 'passport' } } },
  { id: 'pf', accessorKey: 'pf', header: 'PF UAN', size: 140, meta: { type: 'text', editable: true, cellMeta: { pattern: 'pf' } } },
  { id: 'esic', accessorKey: 'esic', header: 'ESIC', size: 170, meta: { type: 'text', editable: true, cellMeta: { pattern: 'esic' } } },
  { id: 'iban', accessorKey: 'iban', header: 'IBAN', size: 240, meta: { type: 'text', editable: true, cellMeta: { pattern: 'iban' } } },
  { id: 'swift', accessorKey: 'swift', header: 'SWIFT', size: 120, meta: { type: 'text', editable: true, cellMeta: { pattern: 'swift' } } },
  { id: 'card', accessorKey: 'card', header: 'Card', size: 170, meta: { type: 'text', editable: true, cellMeta: { pattern: 'creditCard' } } },
]

/**
 * Virtualization (D1) — a big, WIDE dataset (20,000 rows × 42 columns). With
 * `enableVirtualization` + `enableColumnVirtualization` the grid keeps only the
 * rows and columns inside the viewport in the DOM, so it scrolls at 60fps and the
 * DOM node count stays bounded no matter how large the data grows.
 */
export type WideRow = { id: string; name: string; city: string } & Record<string, number>
const VIRTUAL_CITIES = ['London', 'Paris', 'Tokyo', 'Berlin', 'Mumbai', 'Austin', 'Oslo', 'Lima']
export const wideVirtualColumns: BstTableColumn<WideRow>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', size: 160, meta: { type: 'text' } },
  { id: 'city', accessorKey: 'city', header: 'City', size: 130, meta: { type: 'text' } },
  ...Array.from({ length: 40 }, (_, c) => ({
    id: `m${c}`,
    accessorKey: `m${c}`,
    header: `Metric ${c + 1}`,
    size: 110,
    meta: { type: 'number' as const, align: 'right' as const },
  })),
]
export const wideVirtualRows: WideRow[] = Array.from({ length: 20000 }, (_, i) => {
  const row = {
    id: `w${i}`,
    name: `${SERVER_FIRST[i % SERVER_FIRST.length]} ${i + 1}`,
    city: VIRTUAL_CITIES[i % VIRTUAL_CITIES.length],
  } as WideRow
  for (let c = 0; c < 40; c++) row[`m${c}`] = (i * (c + 3)) % 1000
  return row
})

/** Read-oriented column subset for the server-driven grid (sortable + filterable). */
export const serverColumns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric', size: 150, meta: { type: 'text' } },
  { id: 'email', accessorKey: 'email', header: 'Email', size: 210, meta: { type: 'text' } },
  { id: 'role', accessorKey: 'role', header: 'Role', size: 110, meta: { type: 'text' } },
  {
    id: 'salary', accessorKey: 'salary', header: 'Salary', sortFn: 'basic', size: 130,
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic', size: 90, meta: { type: 'number', align: 'right' } },
  { id: 'active', accessorKey: 'active', header: 'Active', size: 90, meta: { type: 'boolean' } },
]
