import { BstTableMui } from '@bloomskill/table-mui';
import { BstTableShadcn } from '@bloomskill/table-shadcn';
// Icon preset backed by lucide-react — shadcn/ui's default icon set. (Presets for
// tabler / hugeicons / phosphor / remix live at the same `.../icons/*` subpaths.)
import { lucideIcons } from '@bloomskill/table-shadcn/icons/lucide';
import {
  BstConditionalFormatBuilder,
  useBstDataSource,
  useBstInfiniteDataSource,
  createClientDataSource,
  clearGridState,
  useBstTable,
  BstTable,
  BstPdfThumbnailerProvider,
  createPdfjsThumbnailer,
} from '@bloomskill/table-engine';
import type { BstTableColumn, BstFormatRule, BstGridStateStorage } from '@bloomskill/table-engine';
// pdf.js powers the in-cell PDF thumbnails (B5). The engine never imports pdf.js —
// the app owns it (and its worker), then injects a renderer via the provider.
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const pdfThumbnailer = createPdfjsThumbnailer(pdfjsLib);
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import * as React from 'react';

// Grid body styles from the engine + the shadcn skin's chrome styles.
// (MUI's chrome is styled at runtime by Emotion, so it needs no CSS import.)
import '@bloomskill/table-engine/styles.css';
import '@bloomskill/table-shadcn/styles.css';

import {
  columns,
  people,
  pdfDoc,
  newPerson,
  dbTables,
  dbTableColumns,
  dbFieldColumns,
  serverPeople,
  serverColumns,
  erpVendors,
  erpColumns,
  wideVirtualRows,
  wideVirtualColumns,
  type Person,
  type DbTable,
  type DbField,
  type ErpVendor,
  type WideRow,
} from './data';

const box: React.CSSProperties = {
  border: '1px solid #8883',
  borderRadius: 10,
  padding: '12px 16px',
  fontSize: 13.5,
  lineHeight: 1.6,
};

// Cell spanning (v0.12.0) demo data — a little sales roster.
type SpanRowT = { id: string; region: string; rep: string; quarter: string; deals: number };
const spanData: SpanRowT[] = [
  { id: 'a', region: 'North', rep: 'Ada', quarter: 'Q1', deals: 12 },
  { id: 'b', region: 'North', rep: 'Ada', quarter: 'Q2', deals: 9 },
  { id: 'c', region: 'North', rep: 'Bo', quarter: 'Q1', deals: 7 },
  { id: 'd', region: 'South', rep: 'Cy', quarter: 'Q1', deals: 15 },
  { id: 'e', region: 'South', rep: 'Cy', quarter: 'Q2', deals: 4 },
];
const spanColumns: BstTableColumn<SpanRowT>[] = [
  { id: 'region', accessorKey: 'region', header: 'Region', meta: { type: 'text', rowSpan: 'group' } },
  { id: 'rep', accessorKey: 'rep', header: 'Rep', meta: { type: 'text', rowSpan: 'group' } },
  { id: 'quarter', accessorKey: 'quarter', header: 'Quarter', meta: { type: 'text' } },
  { id: 'deals', accessorKey: 'deals', header: 'Deals', meta: { type: 'number' } },
];

// Grouping (v0.15.0) — a column set with aggregates (sum salary, mean age).
const groupColumns: BstTableColumn<Person>[] = [
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text' } },
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'plan', accessorKey: 'plan', header: 'Plan', meta: { type: 'text', filter: 'set' } },
  {
    id: 'salary', accessorKey: 'salary', header: 'Salary (Σ)', aggregationFn: 'sum',
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
  {
    id: 'age', accessorKey: 'age', header: 'Age (avg)', aggregationFn: 'mean',
    meta: { type: 'number', align: 'right' },
  },
];

// Conditional formatting (v0.18.0) — a lean column set + a builder column list.
const cfColumns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text' } },
  {
    id: 'salary', accessorKey: 'salary', header: 'Salary', sortFn: 'basic',
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean' } },
];
const cfBuilderColumns = [
  { id: 'name', header: 'Name', type: 'text' },
  { id: 'role', header: 'Role', type: 'text' },
  { id: 'salary', header: 'Salary', type: 'number' },
  { id: 'active', header: 'Active', type: 'boolean' },
];

// In-cell visualization (v0.19.0) — sparklines (M1) + KPI (M2), deterministic data.
type VizRow = { id: string; name: string; sales: number[]; revenue: { value: number; delta: number; data: number[] } };
const vizData: VizRow[] = people.slice(0, 8).map((p, i) => {
  const base = (p.salary ?? 80000) / 1400;
  const sales = Array.from({ length: 9 }, (_, k) =>
    Math.max(4, Math.round(base * (1 + 0.5 * Math.sin((k + i) / 1.4) + 0.15 * (k % 3)))),
  );
  return {
    id: p.id,
    name: p.name,
    sales,
    revenue: { value: p.salary ?? 0, delta: ((i % 5) - 2) * 4, data: sales.slice(-6) },
  };
});
const vizColumns: BstTableColumn<VizRow>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'sales', accessorKey: 'sales', header: 'Sales (area)', meta: { type: 'sparkline', cellMeta: { variant: 'area', width: 120, showValue: true } } },
  { id: 'weekly', accessorKey: 'sales', header: 'Weekly (bar)', meta: { type: 'sparkline', cellMeta: { variant: 'bar', width: 96 } } },
  { id: 'revenue', accessorKey: 'revenue', header: 'Revenue (KPI)', meta: { type: 'kpi', locale: 'en-US', cellMeta: { currency: 'USD', precision: 0, deltaPercent: true } } },
];

// Responsive (v0.22.0) — columns with a hide-priority (higher = kept longer).
const respColumns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', responsivePriority: 5 } },
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text', responsivePriority: 4 } },
  { id: 'salary', accessorKey: 'salary', header: 'Salary', meta: { type: 'number', responsivePriority: 3, align: 'right', cellMeta: { currency: 'USD', precision: 0 } } },
  { id: 'plan', accessorKey: 'plan', header: 'Plan', meta: { type: 'text', responsivePriority: 2 } },
  { id: 'email', accessorKey: 'email', header: 'Email', meta: { type: 'text', responsivePriority: 1 } },
  { id: 'joined', accessorKey: 'joined', header: 'Joined', meta: { type: 'text', responsivePriority: 0 } },
];

/**
 * Virtualization (D1) — row + column windowing. A 20,000 × 42 grid renders only
 * the cells inside the viewport, so the DOM stays tiny and scrolling is 60fps.
 * `enableVirtualization` turns on row windowing; `enableColumnVirtualization` adds
 * horizontal windowing for the 40 metric columns. Everything else (sort, search,
 * cell selection, clipboard) works unchanged over the full dataset.
 */
function VirtualizationSection() {
  const cellCount = (wideVirtualRows.length * wideVirtualColumns.length).toLocaleString();
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Virtualization — row + column windowing (D1)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <b>{wideVirtualRows.length.toLocaleString()} rows × {wideVirtualColumns.length} columns</b>{' '}
        ({cellCount} cells) in one client-side grid. <code>enableVirtualization</code> renders only
        the rows in view; <code>enableColumnVirtualization</code> does the same horizontally — scroll
        both ways and the DOM node count stays bounded (a few dozen rows, not 20,000). Sorting,
        search and cell selection still run over the <b>whole</b> dataset. Row heights are measured,
        so this composes with variable content; it <i>yields</i> (renders un-windowed) if
        master-detail, grouping, cell spanning or row pinning is on. Open the <b>⚙ settings</b> gear —
        both virtualization toggles live in a <b>Performance</b> group and are <b>always shown</b>, so
        an end-user can switch windowing on for any large grid without developer wiring.
      </div>
      <BstTableMui<WideRow>
        title="20k × 42 (virtualized)"
        columns={wideVirtualColumns}
        data={wideVirtualRows}
        getRowId={(r) => r.id}
        enableVirtualization
        enableColumnVirtualization
        enableCellSelection
        enableClipboard
        pagination={false}
        showPagination={false}
        showSettings={{ persistKey: 'demo-virtual' }}
      />
    </section>
  );
}

/**
 * Infinite scroll (A2) — `useBstInfiniteDataSource` fetches one window at a time
 * from a server `DataSource` and APPENDS as you scroll, instead of paging. Pairs
 * with `enableVirtualization` (you don't want thousands of appended rows in the
 * DOM) + `pagination={false}`. Sort / filter still run server-side and reset the
 * accumulation. Wire `onReachEnd` and the grid fires it as the tail nears.
 */
function InfiniteScrollSection() {
  const source = React.useMemo(
    () => createClientDataSource(serverPeople, { delayMs: 300 }),
    [],
  );
  const inf = useBstInfiniteDataSource(source, { pageSize: 100 });
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Infinite scroll — fetch-on-scroll append (A2)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <code>useBstInfiniteDataSource(source, {'{ pageSize: 100 }'})</code> loads a window at a time
        from a <b>server query</b> (here a <code>createClientDataSource</code> over{' '}
        <b>{serverPeople.length.toLocaleString()} rows</b> with 300&nbsp;ms latency) and{' '}
        <b>appends</b> as you scroll — no pager. Row virtualization keeps the growing list cheap;
        sorting / filtering re-run server-side and reset the accumulation. Spread{' '}
        <code>{'{...inf.tableProps}'}</code> and pass <code>onReachEnd={'{inf.fetchNextPage}'}</code>.
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, flexWrap: 'wrap' }}
      >
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 10px',
            borderRadius: 999, background: inf.isFetchingNextPage || inf.loading ? '#fef9c3' : '#dcfce7',
            color: inf.isFetchingNextPage || inf.loading ? '#854d0e' : '#166534', fontWeight: 600,
          }}
        >
          {inf.loading ? 'Loading…' : inf.isFetchingNextPage ? 'Fetching next…' : 'Idle'}
        </span>
        <span style={{ opacity: 0.75 }}>
          Loaded <b>{inf.rows.length.toLocaleString()}</b> of{' '}
          <b>{inf.totalCount.toLocaleString()}</b> rows{inf.hasNextPage ? ' — scroll for more' : ' — all loaded'}
        </span>
      </div>
      <BstTableMui<Person>
        title="Registers (infinite)"
        columns={serverColumns}
        getRowId={(r) => r.id}
        enableVirtualization
        pagination={false}
        showPagination={false}
        onReachEnd={inf.fetchNextPage}
        {...inf.tableProps}
      />
    </section>
  );
}

/**
 * Server DataSource (Plan.md §5) — the grid runs in TanStack **manual mode**:
 * sorting / filtering / paging happen in the source, and the grid renders exactly
 * the page it is handed. `useBstDataSource` owns the query state and returns
 * `tableProps` to spread into any adapter — the normal chrome (sort headers,
 * filter row, search box, pager) drives it with no adapter-specific wiring.
 */
function ServerDataSourceSection() {
  // Create the source ONCE — useBstDataSource refetches when `source` changes, so
  // a stable identity is required. `delayMs` simulates real server latency so the
  // loading state is visible.
  const source = React.useMemo(
    () => createClientDataSource(serverPeople, { delayMs: 350 }),
    [],
  );
  const ds = useBstDataSource(source, { pageSize: 10 });
  const { pageIndex, pageSize } = ds.tableProps.state.pagination;
  const from = ds.totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(pageIndex * pageSize + ds.rows.length, ds.totalCount);

  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>
        Server DataSource — manual sort / filter / paginate (Plan.md §5)
      </h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <code>useBstDataSource(source, {'{ pageSize: 10 }'})</code> drives this grid from a{' '}
        <b>server query</b> instead of an in-memory array — here a{' '}
        <code>createClientDataSource</code> over{' '}
        <b>{serverPeople.length.toLocaleString()} rows</b> with a simulated{' '}
        <b>350&nbsp;ms latency</b>. Only the current page (10 rows) is ever handed to the grid;{' '}
        <b>sorting, filtering and paging run in the source</b>. Sort <b>Salary</b> ▾ — page 1's top
        row is the max across all {serverPeople.length.toLocaleString()} rows, not just the loaded
        page (the correctness point: a sort over a partial set is <i>wrong</i>, not merely slow).
        Type in <b>search</b> or a <b>column filter</b> and the query re-runs server-side. The hook
        aborts superseded requests, ignores stale responses, debounces filter typing, and resets to
        page&nbsp;1 when the result set changes — <b>no adapter changes</b>, spread{' '}
        <code>{'{...ds.tableProps}'}</code> and the same chrome drives it.
      </div>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontSize: 13, flexWrap: 'wrap' }}
      >
        <span
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 999,
            background: ds.loading ? '#fef9c3' : '#dcfce7',
            color: ds.loading ? '#854d0e' : '#166534', fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 8, height: 8, borderRadius: 999,
              background: ds.loading ? '#eab308' : '#22c55e',
            }}
          />
          {ds.loading ? 'Fetching…' : 'Idle'}
        </span>
        <span style={{ opacity: 0.75 }}>
          Showing <b>{from.toLocaleString()}–{to.toLocaleString()}</b> of{' '}
          <b>{ds.totalCount.toLocaleString()}</b> matching rows
        </span>
        {ds.error && <span style={{ color: '#dc2626' }}>· {ds.error.message}</span>}
      </div>
      <BstTableMui<Person>
        title="Registers (server-driven)"
        columns={serverColumns}
        getRowId={(r) => r.id}
        enableColumnFilterRow
        pageSizeOptions={[10, 25, 50]}
        {...ds.tableProps}
      />
    </section>
  );
}

/**
 * ERP field formats (B1/B2) — Frappe-style validation + input masks on plain
 * `text` / `number` cells via `cellMeta.pattern` (Aadhaar, PAN, GSTIN, IFSC, …).
 */
function ErpFormatsSection() {
  const [rows, setRows] = React.useState<ErpVendor[]>(erpVendors);
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>ERP field formats — Aadhaar · PAN · GSTIN · IFSC · … (B1/B2)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        Frappe-style <b>field formats</b> on a plain <code>text</code> / <code>number</code> cell via{' '}
        <code>cellMeta.pattern</code>: each preset brings its own <b>validation</b> (with real
        checksums — Aadhaar's <i>Verhoeff</i>, GSTIN's mod-36), an <b>input mask</b> and a{' '}
        <b>normalizer</b>. Double-click a cell and type an invalid value — a bad <b>PAN</b>,{' '}
        <b>Aadhaar</b> or <b>GSTIN</b> — to see it blocked with a message; valid values are masked on
        read (Aadhaar → <code>1234 5678 9012</code>, PAN upper-cased, IBAN/Card grouped). Built-ins:{' '}
        <code>aadhaar · pan · gstin · tan · ifsc · email · phone · pincode · url · upi · passport ·
        iec · esic · pf · iban · swift · creditCard</code> — with real checksums for Aadhaar
        (Verhoeff), GSTIN (mod-36), <b>IBAN</b> (mod-97) and <b>Card</b> (Luhn). Add your own with{' '}
        <code>defineFieldFormat</code> or a <code>RegExp</code>. Scroll right for the banking &amp;
        statutory columns.
      </div>
      <BstTableMui<ErpVendor>
        title="Vendors (KYC)"
        data={rows}
        columns={erpColumns}
        getRowId={(r) => r.id}
        enableEditing
        enableValidation
        onDataChange={setRows}
        pagination={false}
        showSearch={false}
      />
    </section>
  );
}

// Files & attachments (B5) — image thumbnails + in-cell PDF thumbnails
// (`cellMeta.pdfThumbnail`). `pdfDoc` (from ./data) builds a real content-rich,
// offline PDF so both the thumbnail and the click-preview show a document.
const demoAvatar =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#6366f1"/><circle cx="32" cy="24" r="12" fill="#c7d2fe"/><rect x="14" y="40" width="36" height="18" rx="9" fill="#c7d2fe"/></svg>',
  );

type DocRow = {
  id: string;
  vendor: string;
  attachments: Array<{ name: string; url?: string; contentType?: string; thumbnailUrl?: string }>;
};

const docRows: DocRow[] = [
  {
    id: '1',
    vendor: 'Acme Corp',
    attachments: [
      { name: 'invoice-2041.pdf', url: pdfDoc('INVOICE 2041'), contentType: 'application/pdf' },
      { name: 'logo.svg', url: demoAvatar, contentType: 'image/svg+xml' },
    ],
  },
  {
    id: '2',
    vendor: 'Globex',
    attachments: [
      { name: 'msa-signed.pdf', url: pdfDoc('MSA SIGNED'), contentType: 'application/pdf' },
      { name: 'w9.pdf', url: pdfDoc('FORM W-9'), contentType: 'application/pdf' },
    ],
  },
  {
    id: '3',
    vendor: 'Initech',
    attachments: [
      // A server-generated raster thumbnail (thumbnailUrl) wins over the native render.
      { name: 'scan.pdf', url: pdfDoc('SCAN'), thumbnailUrl: demoAvatar, contentType: 'application/pdf' },
    ],
  },
];

const docColumns: BstTableColumn<DocRow>[] = [
  { id: 'vendor', accessorKey: 'vendor', header: 'Vendor', meta: { type: 'text' } },
  {
    id: 'attachments',
    accessorKey: 'attachments',
    header: 'Attachments',
    meta: { type: 'files', cellMeta: { pdfThumbnail: true } },
  },
];

/**
 * Grid state — save / restore view (X21). The MUI adapter's one-line
 * `gridState={{ key }}` prop persists this grid's view (sort · filter · column
 * order/size/visibility/pinning · grouping) to `localStorage` and restores it on
 * mount. Interact, then reload the page — the view comes back.
 */
const gsColumns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text' } },
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text' } },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: 'Salary',
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
  { id: 'plan', accessorKey: 'plan', header: 'Plan', meta: { type: 'text' } },
  { id: 'email', accessorKey: 'email', header: 'Email', meta: { type: 'text' } },
];

// Multi-filter (X11) — a DEDICATED section so it doesn't clutter the main grids.
// The Name column opts in via an array meta.filter to stack a "contains" input + a
// distinct-values checklist; the other columns keep their single filter.
const mfColumns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', filter: ['condition', 'set'] } },
  { id: 'role', accessorKey: 'role', header: 'Role', meta: { type: 'text' } },
  {
    id: 'salary',
    accessorKey: 'salary',
    header: 'Salary',
    meta: { type: 'number', align: 'right', cellMeta: { currency: 'USD', precision: 0 } },
  },
];

function MultiFilterSection() {
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Multi-filter — stack filter types on one column (X11)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <code>enableMultiFilter</code> lets a column opt in via an <b>array</b> <code>meta.filter</code>{' '}
        (here <code>['condition', 'set']</code> on <b>Name</b>) to <b>stack</b> two filters in its filter
        row — a <b>"contains"</b> text input <b>and</b> a <b>distinct-values checklist</b>. A row must
        match <b>both</b> (AND). Type <code>a</code> in the Name box, then open its <b>All ▾</b> checklist
        to narrow further. Other columns keep their single filter.
      </div>
      <BstTableMui<Person>
        title="Multi-filter (Name column)"
        data={people.slice(0, 8)}
        columns={mfColumns}
        getRowId={(r) => r.id}
        enableColumnFilterRow
        enableSetFilter
        enableMultiFilter
        pagination={false}
        showSearch={false}
      />
    </section>
  );
}

/**
 * X27 — auto-generate columns. The grid is given `columns={[]}` + `enableAutoColumns`,
 * so it infers one column per key in the data, with a guessed cell type + humanized header.
 */
const autoRows = [
  { sku: 'A-100', productName: 'Widget', unitPrice: 12.5, inStock: true, addedOn: '2024-01-04' },
  { sku: 'A-101', productName: 'Gadget', unitPrice: 8, inStock: false, addedOn: '2024-02-11' },
  { sku: 'A-102', productName: 'Gizmo', unitPrice: 21.75, inStock: true, addedOn: '2024-03-19' },
];
function AutoColumnsSection() {
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Auto-generate columns from data (X27)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        No <code>columns</code> are passed — just <code>columns=&#123;[]&#125;</code> +{' '}
        <code>enableAutoColumns</code>. The grid infers one column per data key (first-seen order),
        guessing the cell type (<b>number</b> for <code>unitPrice</code>, <b>boolean</b> for{' '}
        <code>inStock</code>, <b>date</b> for <code>addedOn</code>) and humanizing the header
        (<code>unitPrice</code> → "Unit Price"). Explicit columns always win over inference.
      </div>
      <BstTableMui
        title="Inferred columns"
        data={autoRows}
        columns={[]}
        enableAutoColumns
        getRowId={(r) => r.sku}
        pagination={false}
        showSearch={false}
      />
    </section>
  );
}

/**
 * X23 — loading / error overlays. Toggle the two states to see the engine's
 * overlays paint over the grid. `useBstDataSource` feeds these automatically in a
 * real server grid; here they're driven by buttons for the demo.
 */
function OverlaysSection() {
  const [loading, setLoading] = React.useState(false);
  const [errored, setErrored] = React.useState(false);
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Loading / error overlays (X23)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <code>enableOverlays</code> (on by default) paints an overlay while <code>loading</code> is
        true or when <code>error</code> is set (error wins). A server grid wired with{' '}
        <code>useBstDataSource</code> gets both for free — its <code>tableProps</code> carry{' '}
        <code>loading</code> + <code>error</code>. Toggle them here:
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => { setLoading((v) => !v); setErrored(false); }}>
            {loading ? 'Stop loading' : 'Show loading'}
          </button>
          <button onClick={() => { setErrored((v) => !v); setLoading(false); }}>
            {errored ? 'Clear error' : 'Show error'}
          </button>
        </div>
      </div>
      <BstTableMui<Person>
        title="Overlays"
        data={people.slice(0, 5)}
        columns={columns}
        getRowId={(r) => r.id}
        loading={loading}
        error={errored ? new Error('Failed to load rows — please retry.') : null}
        pagination={false}
        showSearch={false}
      />
    </section>
  );
}

const GRID_STATE_KEY = 'demo-people-view';

/**
 * A `localStorage` wrapper that logs every grid-state write/clear to the console.
 * `gridState.storage` is a public option (`BstGridStateStorage`), so this needs no
 * library change — click **Save view** and the exact persisted snapshot is logged.
 */
function loggingStorage(label: string): BstGridStateStorage {
  return {
    getItem: (k) => {
      const raw = window.localStorage.getItem(k);
      console.log(`[X21] ${label} · restore ←`, k, raw ? JSON.parse(raw) : null);
      return raw;
    },
    setItem: (k, v) => {
      console.log(`[X21] ${label} · Save view →`, k, JSON.parse(v));
      window.localStorage.setItem(k, v);
    },
    removeItem: (k) => {
      console.log(`[X21] ${label} · Reset view → cleared`, k);
      window.localStorage.removeItem(k);
    },
  };
}

// Module-level so the object identity is stable across renders.
const muiViewStorage = loggingStorage('MUI');
const scViewStorage = loggingStorage('shadcn');
const sectionViewStorage = loggingStorage('X21 section');

function GridStateSection() {
  const [nonce, setNonce] = React.useState(0);
  const [stored, setStored] = React.useState('');
  React.useEffect(() => {
    const read = () => {
      try {
        setStored(window.localStorage.getItem('bst-table:state:' + GRID_STATE_KEY) ?? '');
      } catch {
        /* storage blocked */
      }
    };
    read();
    const id = setInterval(read, 600);
    return () => clearInterval(id);
  }, [nonce]);
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Grid state — save / restore view (X21)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        <b>Sort, resize, reorder, hide or pin</b> a column below, then open the <b>⚙ settings gear</b>{' '}
        and click <b>Save view</b> at the bottom of the sheet — now <b>reload the page</b> and your
        arrangement comes back. This grid uses{' '}
        <code>gridState={'{{'} key: '{GRID_STATE_KEY}', persist: false {'}}'}</code> (manual save) with{' '}
        <code>showSettings</code>, so nothing is written until you click <b>Save view</b>. The live
        snapshot on the right is exactly what gets persisted — separate from the gear's{' '}
        <i>feature</i> toggles above it, and from the settings <b>Reset</b>.
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => {
              clearGridState(GRID_STATE_KEY);
              setNonce((n) => n + 1);
            }}
            style={{ marginBottom: 8, padding: '4px 10px', cursor: 'pointer' }}
          >
            Reset saved view
          </button>
          <BstTableMui<Person>
            key={nonce}
            title="People (your saved view)"
            data={people}
            columns={gsColumns}
            getRowId={(r) => r.id}
            gridState={{ key: GRID_STATE_KEY, persist: false, storage: sectionViewStorage }}
            showSettings={{ persistKey: 'demo-gridstate' }}
            enableColumnPinning
            enableColumnOrdering
            showDensityToggle
            pagination={false}
          />
        </div>
        <pre
          style={{
            ...box,
            flex: '0 1 300px',
            margin: 0,
            maxHeight: 320,
            overflow: 'auto',
            fontSize: 12,
            lineHeight: 1.5,
          }}
        >
          {stored ? JSON.stringify(JSON.parse(stored), null, 2) : '// interact with the grid…'}
        </pre>
      </div>
    </section>
  );
}

const fileSubhead: React.CSSProperties = {
  margin: '0 0 6px',
  fontSize: 13,
  fontWeight: 600,
  opacity: 0.7,
};

/**
 * The B5 files example on the **headless engine table** (`useBstTable` +
 * `<BstTable>`) — the "main table" both adapters wrap. The `files` read cell
 * (image + PDF thumbnails) is engine-level, so it renders identically here with no
 * adapter chrome.
 */
function FilesMainTable() {
  const table = useBstTable<DocRow>({
    data: docRows,
    columns: docColumns,
    getRowId: (r) => r.id,
    pagination: false,
  });
  return (
    <div style={{ ...box, padding: 0, overflow: 'auto' }}>
      <div className="bst-table-root">
        <BstTable table={table} />
      </div>
    </div>
  );
}

function FilesSection({ dark }: { dark: boolean }) {
  return (
    <section>
      <h3 style={{ margin: '0 0 8px' }}>Files &amp; attachments — image + PDF thumbnails (B5)</h3>
      <div style={{ ...box, marginBottom: 8 }}>
        The <code>files</code> cell shows an <b>image thumbnail</b> for pictures and, with{' '}
        <code>cellMeta.pdfThumbnail: true</code>, an <b>in-cell PDF thumbnail</b> of page 1 —
        rendered by <b>pdf.js</b>. The engine never imports pdf.js; this app injects a renderer
        (<code>createPdfjsThumbnailer(pdfjs)</code>) via{' '}
        <code>&lt;BstPdfThumbnailerProvider&gt;</code>. <b>Click any file</b> to open the full preview.
        A server-generated raster (<code>thumbnailUrl</code>, see <i>Initech</i>) wins over the live
        render. The read cell is <b>engine-level</b>, so the <b>same</b> <code>files</code> column
        renders identically across all three below — the MUI adapter, the shadcn adapter and the
        headless main table.
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <div>
          <h4 style={fileSubhead}>MUI adapter</h4>
          <BstTableMui<DocRow>
            title="Vendor documents"
            data={docRows}
            columns={docColumns}
            getRowId={(r) => r.id}
            pagination={false}
            showSearch={false}
          />
        </div>
        <div>
          <h4 style={fileSubhead}>shadcn / Radix adapter</h4>
          <BstTableShadcn<DocRow>
            title="Vendor documents"
            dark={dark}
            icons={lucideIcons}
            data={docRows}
            columns={docColumns}
            getRowId={(r) => r.id}
            pagination={false}
            showSearch={false}
          />
        </div>
        <div>
          <h4 style={fileSubhead}>Main table — headless engine &lt;BstTable/&gt;</h4>
          <FilesMainTable />
        </div>
      </div>
    </section>
  );
}

export default function App() {
  const [dark, setDark] = React.useState(false);
  const [rowMode, setRowMode] = React.useState(false);
  const [lockInactive, setLockInactive] = React.useState(false);
  const [fancy, setFancy] = React.useState(true);
  const [fit, setFit] = React.useState(false);
  const [dataMui, setDataMui] = React.useState<Person[]>(people);
  const [dataSc, setDataSc] = React.useState<Person[]>(people);
  const [dataScInherit, setDataScInherit] = React.useState<Person[]>(people);
  const [dataBatch, setDataBatch] = React.useState<Person[]>(people);
  const [lastSave, setLastSave] = React.useState<string | null>(null);
  const [cfRules, setCfRules] = React.useState<BstFormatRule<Person>[]>([
    { columnId: 'salary', when: { op: 'gte', value: 130000 }, style: { background: '#dcfce7', color: '#166534' } },
    { scope: 'row', columnId: 'active', when: { op: 'isFalse' }, style: { textDecoration: 'line-through', opacity: 0.6 } },
  ]);

  const theme = React.useMemo(
    () => createTheme({ palette: { mode: dark ? 'dark' : 'light' } }),
    [dark],
  );

  // `true` = per-cell editing; `{ mode: 'row' }` = deferred row-session editing.
  const editing = rowMode ? ({ mode: 'row' } as const) : true;

  // Every Phase-1..3 capability, opt-in on the engine, shared by both skins.
  // Access control (F2): "lock inactive rows" greys + disables their cells.
  const common = {
    columns,
    getRowId: (r: Person) => r.id,
    enableEditing: editing,
    enableValidation: true,
    enableRowActions: true,
    // Phase 3
    enableCellSelection: true, // click / Shift-click + Arrow / Tab / Home / End / Ctrl+A
    enableClipboard: true, // Ctrl+C copies TSV · Ctrl+V pastes into editable cells
    enableRowSelection: true, // checkbox column + "n selected" chip
    enableUndoRedo: true, // Ctrl+Z / Ctrl+Y + toolbar buttons
    enableColumnPinning: true, // sticky columns (Name is pinned by default)
    enableColumnOrdering: true, // reorder via the Columns menu
    fitColumns: fit, // G3: size all columns to the viewport — no horizontal scroll
    showDensityToggle: true, // compact / normal / comfortable
    showFilterBuilder: true, // per-column condition builder (E3)
    enableColumnFilterRow: true, // per-column filter inputs under the header ("dual filter")
    enableSetFilter: true, // X4: categorical columns (see role/plan) get a distinct-values checklist
    showStatusBar: true, // X5: footer — row counts + selection sum/avg/min/max
    enableAutoRowHeight: true, // X26: rows grow to fit wrapped content (browser-measured)
    enableStickyHeader: { maxRows: 12 }, // G3/G4: cap the body → sticky header + body scroll (try a bigger page size / "All")
    enableContextMenu: true, // X6: right-click a cell → Copy / Export / Autosize (+ getContextMenuItems)
    enableFind: true, // X8: ⌘/Ctrl+F (or the toolbar ⌕) → highlight + jump between matches (no rows hidden)
    enableRowNumbers: true, // X9: leading # column numbering the current view
    enableExpanding: true, // master-detail (A4): click ▸ for a detail panel
    renderDetail: (r: Person) => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 12,
        }}
      >
        <div style={{ gridColumn: '1 / -1' }}>
          <b>Bio</b>
          <br />
          {r.bio || '—'}
        </div>
        <div><b>Email</b><br />{r.email}</div>
        <div><b>Joined</b><br />{r.joined ?? '—'}</div>
        <div><b>Skills</b><br />{r.skills.length ? r.skills.join(', ') : '—'}</div>
        <div><b>Plan</b><br />{r.plan ?? '—'}</div>
      </div>
    ),
    rowDisabled: lockInactive ? (r: Person) => !r.active : undefined,
    createRow: newPerson,
    pagination: { pageSize: 8 } as const,
    initialState: { columnPinning: { start: ['name'], end: [] } },
  };

  // Custom CSS (v0.10.0) — consumer-owned slots. `className` styles the outer card;
  // `classNames.row` / `.headerCell` add classes (styled by the <style> block below);
  // `styles.cell` is an inline style computed per cell (green for high salaries).
  const customCss = {
    className: fancy ? 'demo-fancy-card' : undefined,
    classNames: {
      headerCell: fancy ? 'demo-head' : undefined,
      row: ({ row, index }: { row: Person; index: number }) => {
        if (!fancy) return undefined;
        const cls: string[] = [];
        if (!row.active) cls.push('demo-inactive');
        if (index % 2) cls.push('demo-odd');
        return cls.join(' ') || undefined;
      },
    },
    styles: {
      cell: (p: { columnId: string; value: unknown }) =>
        fancy && p.columnId === 'salary' && Number(p.value) >= 120000
          ? ({ color: '#16a34a', fontWeight: 700 } as React.CSSProperties)
          : undefined,
    },
  };

  return (
    <BstPdfThumbnailerProvider renderer={pdfThumbnailer}>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <style>{`
        .demo-fancy-card { box-shadow: 0 0 0 2px #6366f1 !important; }
        .demo-head { color: #6366f1; font-weight: 700; }
        .demo-odd .bst-table-td { background: rgba(99, 102, 241, 0.06); }
        /* Dim via COLOR, not opacity: opacity would make the whole cell (incl. a
           pinned column's opaque background) translucent, letting scrolled cells
           bleed through when frozen. Color-based dimming stays fully opaque. */
        .demo-inactive .bst-table-td { text-decoration: line-through; color: #9ca3af; }
      `}</style>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Bst-Table — Phase 3 playground</h1>
            <p style={{ margin: '4px 0 0', opacity: 0.7, fontSize: 14 }}>
              B-series cell types · editing · validation · <b>selection · keyboard · clipboard ·
              undo/redo · row selection · pinning · reorder · density · filter builder · access
              control</b> — same columns through both skins.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={rowMode} onChange={(e) => setRowMode(e.target.checked)} />
            Row-edit mode
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input
              type="checkbox"
              checked={lockInactive}
              onChange={(e) => setLockInactive(e.target.checked)}
            />
            Lock inactive rows
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={fancy} onChange={(e) => setFancy(e.target.checked)} />
            Custom CSS
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
            <input type="checkbox" checked={fit} onChange={(e) => setFit(e.target.checked)} />
            Fit to width
          </label>
          <button onClick={() => setDark((d) => !d)} style={{ padding: '8px 12px' }}>
            {dark ? '☀ Light' : '🌙 Dark'}
          </button>
          <button
            onClick={() => {
              setDataMui(people);
              setDataSc(people);
            }}
            style={{ padding: '8px 12px' }}
          >
            ↺ Reset data
          </button>
        </header>

        <div style={box}>
          <strong>Try it ({rowMode ? 'row-edit mode' : 'cell-edit mode'}):</strong>
          <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
            <li><b>Select &amp; navigate</b> — click a cell, <kbd>Shift</kbd>+click to select a range;
              move with <kbd>↑↓←→</kbd> / <kbd>Tab</kbd> / <kbd>Home</kbd> / <kbd>End</kbd>,
              <kbd>Ctrl/⌘</kbd>+<kbd>A</kbd> to select all. <kbd>Enter</kbd> / <kbd>F2</kbd> edits.</li>
            <li><b>Clipboard</b> — <kbd>Ctrl/⌘</kbd>+<kbd>C</kbd> copies the selection as TSV;
              <kbd>Ctrl/⌘</kbd>+<kbd>V</kbd> pastes into editable cells (paste multi-cell TSV to fill a range).</li>
            <li><b>Undo / redo</b> — edit, delete or paste, then the toolbar <em>↶ / ↷</em> buttons
              (or <kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd> / <kbd>Ctrl/⌘</kbd>+<kbd>Y</kbd>).</li>
            <li><b>Row selection</b> — the checkbox column: header selects all, per-row selects one;
              a “<em>n selected</em>” chip + <em>Clear</em> appears in the toolbar.</li>
            <li><b>Filters (E3)</b> — the <em>Filters</em> button → add per-column conditions
              (contains, =, &gt;, between, is/ is not, …).</li>
            <li><b>Per-column filters</b> — the input row right under the headers filters each column
              on its own (text/number = contains, dropdowns for selects, ✓/— for booleans). Works
              together with the Filters panel above.</li>
            <li><b>Resize &amp; drag-reorder columns</b> — drag a column’s <em>right edge</em> to
              resize its width; drag a column <em>header</em> onto another to reorder them.</li>
            <li><b>Density</b> — the density button cycles compact / normal / comfortable row heights.</li>
            <li><b>Master-detail</b> — click the <em>▸</em> in the leading column to expand a row into a
              full-width detail panel (bio, email, joined, skills, plan); <em>▾</em> collapses it.</li>
            <li><b>Settings sheet</b> — the ⚙ gear (top-right) slides out a per-table settings sheet:
              flip any feature (e.g. turn <em>Copy &amp; paste</em> or <em>Sorting</em> off) and it
              applies live. Choices are saved to <code>localStorage</code> per table, so they survive
              a reload.</li>
            <li><b>Custom CSS</b> — toggle <em>Custom CSS</em> (top-right): consumer <code>classNames</code>/
              <code>styles</code> slots add the indigo header, zebra rows, struck-through inactive rows,
              green high salaries and the card outline — your own CSS, composed over the theme.</li>
            <li><b>Pin &amp; reorder &amp; hide</b> — the <em>Columns</em> menu: 📌 pins a column (Name is pinned by
              default — scroll right to see it stay), ‹ › move it left/right, and the 👁 eye toggle
              hides/shows a column (or use its checkbox).</li>
            <li><b>Access control</b> — tick <em>Lock inactive rows</em>: inactive people grey out and
              can’t be edited (grid → row → column → cell cascade).</li>
            <li><b>Editing / validation / cell types</b> — double-click Name / Age / Salary / Website;
              clear Name or set Age &lt; 18 for the error ring; email <code>taken@acme.io</code> ⇒ async
              “already taken”. Both skins hold independent data.</li>
          </ul>
        </div>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>MUI adapter</h3>
          <BstTableMui<Person>
            title="People"
            {...common}
            {...customCss}
            data={dataMui}
            onDataChange={setDataMui}
            pageSizeOptions={[8, 16, 50, 'all']} // 'all' → show every row (scrolls inside the sticky-header box)
            showColumnEditToggle // G/F4: per-column edit lock in the Columns menu
            showFormatBuilder // K3: 🎨 Formats button → conditional-format rule builder
            conditionalFormats={cfRules}
            onConditionalFormatsChange={setCfRules}
            enableExport={{ fileName: 'people' }} // Phase 5 (X1–X3): CSV / Excel / Print toolbar menu
            showSettings={{ persistKey: 'demo-mui' }}
            gridState={{ key: 'demo-mui-view', persist: false, storage: muiViewStorage }} // X21: ⚙ sheet footer → Save view / Reset view
            showShortcuts // ⌨ keyboard-shortcuts overlay (also opens on ?)
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>shadcn / Radix adapter</h3>
          <BstTableShadcn<Person>
            title="People"
            dark={dark}
            {...common}
            {...customCss}
            data={dataSc}
            onDataChange={setDataSc}
            pageSizeOptions={[8, 16, 50, 'all']} // 'all' → show every row (scrolls inside the sticky-header box)
            showColumnEditToggle // G/F4: per-column edit lock in the Columns menu
            showFormatBuilder // K3: 🎨 Formats button → conditional-format rule builder
            conditionalFormats={cfRules}
            onConditionalFormatsChange={setCfRules}
            enableExport={{ fileName: 'people' }} // Phase 5 (X1–X3): CSV / Excel / Print toolbar menu
            showSettings={{ persistKey: 'demo-sc' }}
            gridState={{ key: 'demo-sc-view', persist: false, storage: scViewStorage }} // X21: ⚙ sheet footer → Save view / Reset view
            showShortcuts // ⌨ keyboard-shortcuts overlay (also opens on ?)
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>
            shadcn — dropped into your own template (theme="inherit" + lucide icons)
          </h3>
          {/* This block stands in for a real shadcn app: it declares the standard
              shadcn design tokens (HSL-channel form) and flips them under `.dark`.
              `theme="inherit"` makes the grid read them, so it matches the host —
              here a violet --primary/--ring and a rounded --radius. Dark follows
              the ambient `.dark` class (the top-right toggle), no `dark` prop. */}
          <style>{`
            .sc-host {
              --background: 0 0% 100%; --foreground: 240 10% 3.9%;
              --card: 0 0% 100%; --card-foreground: 240 10% 3.9%;
              --muted: 240 4.8% 95.9%; --muted-foreground: 240 3.8% 46.1%;
              --border: 240 5.9% 90%; --input: 240 5.9% 90%; --ring: 262 83% 58%;
              --primary: 262 83% 58%; --primary-foreground: 0 0% 100%;
              --accent: 240 4.8% 95.9%; --accent-foreground: 240 5.9% 10%;
              --radius: 0.65rem;
            }
            .sc-host.dark {
              --background: 240 10% 3.9%; --foreground: 0 0% 98%;
              --card: 240 10% 5.5%; --card-foreground: 0 0% 98%;
              --muted: 240 3.7% 15.9%; --muted-foreground: 240 5% 64.9%;
              --border: 240 3.7% 18%; --input: 240 3.7% 18%; --ring: 263 70% 60%;
              --primary: 263 70% 60%; --primary-foreground: 0 0% 98%;
              --accent: 240 3.7% 15.9%; --accent-foreground: 0 0% 98%;
            }
          `}</style>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>theme="inherit"</code> pulls the palette from this section's shadcn tokens (note
            the <b>violet</b> <code>--primary</code>/<code>--ring</code> and rounder{' '}
            <code>--radius</code>), and dark follows the ambient <code>.dark</code> class — the same{' '}
            <em>Dark</em> toggle above, no <code>dark</code> prop. Icons come from{' '}
            <code>lucide-react</code> via <code>icons={'{lucideIcons}'}</code>. Swap in{' '}
            <code>tokenFormat="oklch"</code> for a Tailwind-v4 template.
          </div>
          <div className={'sc-host' + (dark ? ' dark' : '')}>
            <BstTableShadcn<Person>
              title="People"
              theme="inherit"
              icons={lucideIcons}
              {...common}
              data={dataScInherit}
              onDataChange={setDataScInherit}
              showSettings={{ persistKey: 'demo-sc-inherit' }}
            />
          </div>
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>
            Batch editing + review-changes sheet — one API call (C2/I2/I4)
          </h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>{`enableEditing={{ mode: 'batch' }}`}</code>: every edit (typed or pasted) stays
            an <b>unsaved draft</b> — nothing writes upstream. Edit a few cells, then hit{' '}
            <b>Review &amp; save</b>: the sheet lists each change (<b>row · column · old → new</b>)
            with per-change / per-row <b>revert</b>, and its <b>Save</b> confirmation fires{' '}
            <b>ONE</b> <code>onSave</code> for the whole batch — cell-wise <code>changes</code>,
            row-wise <code>rows[].patch</code> or grid-wise <code>next</code>, your pick of
            granularity, one request either way (a rejected call keeps every draft).{' '}
            <b>New:</b> open the ⚙ settings → <i>Editing</i> → <b>Batch editing</b> to switch the
            whole mode off/on at runtime (<code>enableBatchEditing</code>) — off = per-cell
            commits + plain save bar, on = drafts + Review &amp; save.
            {lastSave && (
              <>
                {' '}Last save: <b>{lastSave}</b>.
              </>
            )}
          </div>
          <BstTableMui<Person>
            title="Quarterly review (batch)"
            data={dataBatch}
            columns={columns.slice(0, 6)}
            getRowId={(r) => r.id}
            enableEditing={{ mode: 'batch' }}
            enableValidation
            enableClipboard
            onDataChange={setDataBatch}
            onSave={async (e) => {
              // Simulates the single backend request (e.g. a row-wise batch PATCH).
              await new Promise((r) => setTimeout(r, 600));
              setLastSave(
                `1 call · ${e.changes.length} change${e.changes.length === 1 ? '' : 's'} across ` +
                  `${e.rows.length} row${e.rows.length === 1 ? '' : 's'}`,
              );
            }}
            changesRowLabel={(row) => row?.name ?? 'New row'}
            pagination={{ pageSize: 8 }}
            showSettings={{ persistKey: 'demo-batch' }}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Cell spanning — column + row (A5)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>enableCellSpanning</code>: <code>meta.rowSpan:'group'</code> merges equal{' '}
            <b>Region</b> / <b>Rep</b> values downward; <code>getCellSpan</code> spans Bo’s{' '}
            <b>Quarter</b> cell across two columns. Covered cells drop out of the DOM.
          </div>
          <BstTableMui<SpanRowT>
            data={spanData}
            columns={spanColumns}
            getRowId={(r) => r.id}
            enableCellSpanning
            getCellSpan={({ rowId, columnId }) =>
              rowId === 'c' && columnId === 'quarter' ? { colSpan: 2 } : undefined
            }
            showToolbar={false}
            pagination={false}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Master-detail — nested table (A4)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>renderDetail</code> can return a <b>full nested Bst-Table</b>, not just a flat
            panel: each catalog row expands into its column metadata rendered as its own grid —
            with its <b>own header row</b> (Column · Type · Nullable · Default · PK), own value
            rows and own sorting, completely independent of the parent's columns.{' '}
            <b>users</b> starts expanded; click ▸ on the others.
          </div>
          <BstTableMui<DbTable>
            title="Database catalog"
            data={dbTables}
            columns={dbTableColumns}
            getRowId={(r) => r.id}
            enableExpanding
            renderDetail={(t) => (
              <div style={{ padding: '4px 2px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, opacity: 0.7, margin: '0 0 6px' }}>
                  {t.schema}.{t.name} — {t.fields.length} columns
                </div>
                {/* The detail panel IS another BstTable instance — its own header + values. */}
                <BstTableMui<DbField>
                  data={t.fields}
                  columns={dbFieldColumns}
                  getRowId={(f) => f.id}
                  showToolbar={false}
                  pagination={false}
                />
              </div>
            )}
            initialState={{ expanded: { users: true } }}
            pagination={false}
            showSearch={false}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Row pinning (G1)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>enableRowPinning</code>: the <b>📌</b> in the leading column cycles a row
            <b> top → bottom → unpinned</b>. Pinned rows freeze while the body scrolls and stay put
            across sorting. <b>Alice</b> is pre-pinned to the top and <b>Liam</b> to the bottom —
            scroll this grid to watch them stick.
          </div>
          <BstTableMui<Person>
            data={people}
            columns={columns.slice(0, 5)}
            getRowId={(r) => r.id}
            enableRowPinning
            enableSorting
            pagination={false}
            showToolbar={false}
            initialState={{ rowPinning: { top: ['1'], bottom: ['12'] } }}
            styles={{ root: { maxHeight: 260 } }}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Row resize (G2)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>enableRowResize</code>: hover a row's <b>bottom edge</b> and drag to set its
            height — the whole row's cells grow/shrink and taller content gets room to wrap.{' '}
            <b>Double-click</b> the handle to reset a row. Heights are local UI state. This toggle is{' '}
            <b>always shown in the settings sheet</b> (⚙ → Rows), so an end-user can switch it on
            themselves — no developer wiring required.
          </div>
          <BstTableMui<Person>
            data={people.slice(0, 6)}
            columns={columns.slice(0, 5)}
            getRowId={(r) => r.id}
            enableRowResize
            pagination={false}
            showToolbar={false}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Grouping (E4)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>enableGrouping</code>: rows are grouped by <b>Role</b>, each header showing a{' '}
            <b>salary total</b> (sum) and <b>average age</b> (mean) with a row count. Click a group's
            ▸/▾ to collapse/expand; use the <b>Columns</b> menu's <b>▤</b> to group by a different
            column (try <b>Plan</b>).
          </div>
          <BstTableMui<Person>
            data={people}
            columns={groupColumns}
            getRowId={(r) => r.id}
            enableGrouping
            initialState={{ grouping: ['role'] }}
            pagination={false}
            showSearch={false}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Conditional formatting (K3)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <code>conditionalFormats</code> — declarative rules colour cells/rows by value (reusing
            the E3 operators). Seeded: <b>salary ≥ $130k → green</b>;{' '}
            <b>inactive people → struck through</b> (row scope). <b>New:</b> the toolbar's{' '}
            <b>🎨 Formats</b> button (<code>showFormatBuilder</code>) opens/closes the rule builder
            right in the grid — add, edit or delete rules at runtime (scope · column · operator ·
            value · style). The ⚙ settings → <i>Display</i> also always offers{' '}
            <b>Conditional formatting</b> (the on/off switch for the rules) and{' '}
            <b>Format builder</b> (this button), so end-users can summon both on any grid.
          </div>
          <BstTableMui<Person>
            data={people}
            columns={cfColumns}
            getRowId={(r) => r.id}
            conditionalFormats={cfRules}
            onConditionalFormatsChange={setCfRules}
            showFormatBuilder
            pagination={false}
            showSearch={false}
            showSettings={{ persistKey: 'demo-cf' }}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>In-cell visualization — sparklines (M1) + KPI (M2)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            Two dep-free cell types (inline SVG): <code>type: 'sparkline'</code> (line / area / bar
            via <code>cellMeta.variant</code>) and <code>type: 'kpi'</code> (value + trend delta chip
            + optional mini spark). No charting library.
          </div>
          <BstTableMui<VizRow>
            data={vizData}
            columns={vizColumns}
            getRowId={(r) => r.id}
            pagination={false}
            showSearch={false}
          />
        </section>

        <section>
          <h3 style={{ margin: '0 0 8px' }}>Responsive (G4) + column auto-size (D3)</h3>
          <div style={{ ...box, marginBottom: 8 }}>
            <b>Responsive (G4):</b> <code>enableResponsive</code> + <code>meta.responsivePriority</code>{' '}
            — <b>drag the panel's right edge</b> to narrow it; the lowest-priority columns
            (Joined → Email → Plan → …) hide, and reappear as you widen.{' '}
            <b>Auto-size (D3):</b> double-click a column's right border to fit it to its content.
          </div>
          <div style={{ resize: 'horizontal', overflow: 'auto', minWidth: 300, maxWidth: '100%', paddingBottom: 10 }}>
            <BstTableMui<Person>
              data={people}
              columns={respColumns}
              getRowId={(r) => r.id}
              enableResponsive
              pagination={false}
              showToolbar={false}
            />
          </div>
        </section>

        <ErpFormatsSection />

        <GridStateSection />

        <MultiFilterSection />

        <AutoColumnsSection />

        <OverlaysSection />

        <FilesSection dark={dark} />

        <VirtualizationSection />

        <InfiniteScrollSection />

        <ServerDataSourceSection />

        <footer style={{ opacity: 0.6, fontSize: 13 }}>
          Same <code>data</code> and <code>columns</code> feed both grids. Every capability is an
          <code> enable*</code> (engine) / <code>show*</code> (chrome) opt-in — selection, clipboard,
          undo/redo, row selection, pinning, reordering, density and the filter builder all come from
          the shared engine + each skin’s preset.
        </footer>
      </div>
    </ThemeProvider>
    </BstPdfThumbnailerProvider>
  );
}
