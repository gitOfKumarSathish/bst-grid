# @bloomskill/table-mui

[![npm](https://img.shields.io/npm/v/@bloomskill/table-mui.svg)](https://www.npmjs.com/package/@bloomskill/table-mui)
[![license](https://img.shields.io/npm/l/@bloomskill/table-mui.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-online-2ea44f.svg)](https://gitofkumarsathish.github.io/bst-grid/)

The **Material UI skin** for Bst-Table. Wraps the headless
[`@bloomskill/table-engine`](https://www.npmjs.com/package/@bloomskill/table-engine)
with a MUI toolbar, column-visibility menu, and pagination bar — and maps your MUI
theme onto the grid automatically (light/dark included).

Same data and columns as any other Bst-Table skin, so you can swap to
[`@bloomskill/table-shadcn`](https://www.npmjs.com/package/@bloomskill/table-shadcn)
without touching your data code.

## 📚 Documentation

Full guides, a complete API reference and **live, editable demos** (this skin included) are on the docs site — **[gitofkumarsathish.github.io/bst-grid](https://gitofkumarsathish.github.io/bst-grid/)**:

| Guide | Reference | More |
| :-- | :-- | :-- |
| [Getting Started](https://gitofkumarsathish.github.io/bst-grid/docs/getting-started) | [Feature Guides](https://gitofkumarsathish.github.io/bst-grid/docs/features) | [Styling & Theming](https://gitofkumarsathish.github.io/bst-grid/docs/theming) |
| [Installation](https://gitofkumarsathish.github.io/bst-grid/docs/installation) | [Cell Types](https://gitofkumarsathish.github.io/bst-grid/docs/cell-types) | [AI Agents & MCP](https://gitofkumarsathish.github.io/bst-grid/docs/ai-agents) |
| [Recipes](https://gitofkumarsathish.github.io/bst-grid/docs/recipes) | [API Reference](https://gitofkumarsathish.github.io/bst-grid/docs/api) | [Coverage & Roadmap](https://gitofkumarsathish.github.io/bst-grid/docs/coverage) |

## Features

- 🧱 **Drop-in MUI grid** — one `<BstTableMui />` component.
- 🔎 **Global search** box, **columns** visibility menu, **pagination** bar — all MUI.
- ✏️ **MUI cell editors** for the full B-series — `TextField` (text/number/date via native input types), `Select`/multi-`Select` (open on edit, single-select commits on pick, multi-select shows per-option **checkboxes** + colour swatches and commits on close), `Radio`, `Checkbox`/`Switch`, and `Dialog` popup editors for long text & files. The **files** editor adds **click-to-preview** (images inline · PDFs in the browser's native viewer) and configurable **upload/delete** via `cellMeta.onUpload`/`onDelete`; read cells show image thumbnails and, with `cellMeta.pdfThumbnail` + a `<BstPdfThumbnailerProvider>` (pdf.js), an in-cell **PDF page-1 thumbnail**. Wired via `createMuiPreset()`. The `Select` editors are flagged `overlayEditor` so their portalled menu doesn't discard the edit on open.
- 🧪 **Editing + validation chrome** — **Add row** button, an unsaved-changes **Save / Discard** bar, inline error rings + messages.
- ⌨️ **Selection · keyboard nav · clipboard** — pass `enableCellSelection` / `enableClipboard`; the grid body handles range selection, Arrow/Tab/Home/End navigation, and copy/paste (TSV). No extra MUI wiring needed. The **Columns menu** gains a **Copy-column** button (📋) per column — copies the whole column across **all pages** (also Ctrl/Cmd+Space). Whole-column and whole-row copy are sub-toggles: **`enableCopyColumn`** / **`enableCopyRow`** (both default `true`; Shift+Space copies a row).
- ☑️ **Row selection** — `enableRowSelection` renders a checkbox column (header select-all + per-row) and a toolbar "{n} selected" chip + Clear (`showSelectionInfo`).
- ↩️ **Undo/redo** — `enableUndoRedo` adds toolbar Undo/Redo buttons (`showUndoRedo`) wired to the engine's edit history (Ctrl/Cmd+Z / Ctrl/Cmd+Y also work).
- 📌 **Layout chrome** — `enableColumnPinning` / `enableColumnOrdering` add pin + move controls to the columns menu (sticky columns, reorder); `showDensityToggle` cycles row-height density; **`enableRowResize`** lets users drag a row's bottom edge to set its height (double-click to reset). **`showColumnEditToggle`** adds a per-column **edit lock/unlock** (✏️) so an end-user can make an editable column read-only at runtime (requires `enableEditing`).
- 👁️ **Hide / show columns** — with `enableHiding` (on by default) the **Columns menu** gives each column an **eye / eye-off** toggle (👁 visible · 🚫 hidden) beside the pin/reorder/copy/edit controls — the one-click per-column hide affordance, alongside the existing visibility checkbox. The runtime settings sheet exposes the same capability as **Show / hide columns**.
- 📤 **Export** — `enableExport` adds a toolbar **Export** menu (`showExport`) — download **CSV**, download **Excel** (`.xlsx`) or **print** — built on the engine's dependency-free serializers (no `exceljs`). Per-format sub-toggles `enableCsvExport` / `enableExcelExport` / `enablePrint`.
- 🔎 **Set Filter** — `enableSetFilter` gives categorical columns an Excel-style **checklist of distinct values** in the filter row (search · select-all/clear · counts · (Blanks)); needs `enableColumnFilterRow`.
- 🔎 **Multi-filter** — `enableMultiFilter` lets a column **stack filter types** via an array `meta.filter` (e.g. `['condition', 'set']`): the filters render stacked in the row and a row must satisfy all of them (AND). Needs `enableColumnFilterRow`.
- 📊 **Status bar** — `showStatusBar` adds a footer with total / filtered row counts and, when a cell range is selected, the **sum / avg / min / max / count** of its numeric cells.
- 🔎 **Find** — `enableFind` adds an in-grid **find bar** (toolbar **⌕** button `showFind`, or ⌘/Ctrl+F) that **highlights matches and jumps between them** (Next / Prev · "n / m") **without hiding rows** — distinct from global search, which filters non-matches out.
- 🔢 **Row numbers · auto-columns · overlays** — engine features inherited by this skin: `enableRowNumbers` adds a leading `#` column (numbering the current view); `enableAutoColumns` infers columns from the data when you pass `columns={[]}`; `enableOverlays` (on by default) shows loading / error overlays fed by `loading` / `error` (which `useBstDataSource` provides). All three are in the ⚙ settings sheet.
- 🔎 **Filter builder** — `showFilterBuilder` adds a "Filters (n)" button + a panel with per-column condition rows (operator-aware). Add `enableColumnFilterRow` for a second, inline per-column filter row; drag a header to reorder, drag its edge to resize.
- 🎨 **Conditional-format builder** — `showFormatBuilder` adds a "Formats (n)" button that opens/closes a panel hosting `<BstConditionalFormatBuilder>`: end-users add / edit / delete `conditionalFormats` rules at runtime (uncontrolled local state by default; pass `onConditionalFormatsChange` to own the rules). Hidden while `enableConditionalFormatting` is off.
- ⚙️ **Settings sheet** — `showSettings` adds a gear that slides out a right-side **Drawer** where end-users flip this grid's features on/off at runtime (**per table**), saved to `localStorage`. Only features you've provisioned appear — e.g. turn **Copy & paste** off to disable clipboard, no code change.
- 💾 **Grid state save/restore** — `gridState={{ key: 'orders' }}` persists this grid's **view** (sort · filter · column order/size/visibility/pinning · grouping) to `localStorage` and restores it on the next mount — a per-user view that survives reloads, in one prop. For **manual save**, pass `persist: false` and turn on `showSettings`: a **Save view** button (plus **Reset view**) appears at the bottom of the settings sheet, so the user saves the arrangement on demand instead of on every change. The sheet's two halves persist **separately**: the feature toggles at the top save **automatically** (`bst-table:settings:<key>`), while the **Saved view** section at the bottom (present only with `gridState`) covers sort / filters / column layout under its own key — in manual mode it saves **on click**. Each half has its own Reset, and the sheet labels which is which.
- ⌨️ **Keyboard-shortcuts overlay** — `showShortcuts` adds a **"?" button** (also opens on the `?` key) → a theme-aware overlay listing the keyboard shortcuts **active on this grid** (grouped · searchable · ⌘/Ctrl-aware; force with `showShortcuts={{ platform: 'mac' }}`); it shows only what's wired (selection / clipboard / editing / undo).
- 🧹 **Leaner toolbar** — **Add row** sits in a footer bar under the table, and **Undo/Redo · Density · Formats** collapse into a single **"⋯ More"** menu.
- 🗂️ **Review-changes sheet** — with `enableEditing={{ mode: 'batch' }}` every edit stays an unsaved draft; the toolbar shows **"{n} unsaved" + Review & save**, opening a sheet that lists each edit (**row · column · old → new**) with per-change revert and the final **Save** — which fires **ONE** `onSave` call for the whole batch (cell-wise `changes`, row-wise `rows[].patch`, or grid-wise `next`), never a request per cell. A failed call keeps every draft. End-users can switch batch mode on/off themselves from the ⚙ settings sheet ("Editing" → **Batch editing**, `enableBatchEditing`).
- 🎨 **Theme-aware** — reads your `ThemeProvider` theme → grid `--bst-table-*` vars (light & dark).
- 🖼️ **Material icons throughout** — the toolbar/menu **and** the grid body (sort arrows, expander, row-pin, boolean check, filter/format remove, group toggle) render `@mui/icons-material` — no emoji. The adapter forwards its icon set into the engine body via `<BstTable icons={…}>`.
- 🖌️ **Custom CSS** — `className` / `style` on the outer card; the engine's `classNames` / `styles` slots + per-column `meta.cellClassName` / `headerClassName` style the grid body.
- 📈 **In-cell visualization** — `sparkline` (line / area / bar) and `kpi` (value + delta + mini-spark) cell types via `meta.type` — dep-free inline SVG, no charting library.
- 🔳 **QR · barcode · rich-text cells** — `meta.type: 'qr'` / `'barcode'` render dep-free inline-SVG QR codes + Code 128 barcodes; `'richText'` stores sanitized HTML — a plain-text preview by default, or set `cellMeta.render: 'html'` to show it **formatted** in the cell — and edits in a MUI **Dialog** with Material format icons. From the shared engine.
- ⋯ **Row action menu** — `meta.type: 'actionMenu'` renders a compact **⋯** kebab popup of the row's
  actions (edit / save / cancel / duplicate / delete), the space-saving alternative to the inline
  `action` buttons. Inherited from the engine preset, styled by the skin.
- 📏 **Column auto-size** — **double-click** any resize handle to fit the column to its content
  (sampled `canvas.measureText`, clamped to `minSize`/`maxSize`). Pair `enableResponsive` with
  `meta.responsivePriority` to drop low-priority columns on narrow screens, or use `fitColumns` to
  remove horizontal scrolling entirely.
- 🚀 **Virtualization + infinite scroll** — `enableVirtualization` (+ `enableColumnVirtualization`)
  windows rows/columns so a 20k-row grid stays at 60fps with a bounded DOM; `useBstInfiniteDataSource`
  + `onReachEnd` append on scroll over a server `DataSource`. Both flow through the adapter unchanged —
  no MUI wiring. (Virtualization yields to master-detail / grouping / spanning / row-pinning.)
- 🎛 **Per-instance toggles** — engine `enable*` behaviour + adapter `show*` chrome.
- ✅ OOTB sorting · search · pagination · column visibility · resizing.

## Install

```bash
npm install @bloomskill/table-mui @bloomskill/table-engine \
  @mui/material @mui/icons-material @emotion/react @emotion/styled \
  react react-dom
```

## Usage

```tsx
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Person = { id: string; name: string; role: string; age: number }

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

export function People({ rows }: { rows: Person[] }) {
  return (
    <BstTableMui
      title="People"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      pagination={{ pageSize: 10 }}
    />
  )
}
```

Wrap in a MUI `ThemeProvider` to theme it (optional — MUI's default theme is used otherwise):

```tsx
import { ThemeProvider, createTheme } from '@mui/material/styles'

<ThemeProvider theme={createTheme({ palette: { mode: 'dark' } })}>
  <BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} />
</ThemeProvider>
```

### Editing

Turn on editing + row actions and own the data with `onDataChange`. Columns opt in via
`meta.type` + `meta.editable`; the MUI editor preset is applied automatically.

```tsx
const [rows, setRows] = React.useState(seed)

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', meta: { type: 'text', editable: true } },
  { id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true, cellMeta: { required: true } } },
  { id: 'role', accessorKey: 'role', header: 'Role',
    meta: { type: 'singleSelect', editable: true, options: [{ value: 'admin', label: 'Admin' }, { value: 'user', label: 'User' }] } },
  { id: 'actions', header: '', meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } } },
]

<BstTableMui
  title="People"
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  enableEditing            // or { mode: 'row', policy: 'blockCommitOnError' }
  enableValidation
  enableRowActions
  onDataChange={setRows}
/>
```

Bring your own editors by passing a `cellTypes` registry (e.g. start from `createMuiPreset()` and override a type).

### Runtime settings sheet

`showSettings` lets **end-users** customize a grid without touching code — a gear opens a
right-side sheet of feature toggles under a **highlighted header**, with a **search box** to filter
the 30+ list. Sections are **divider-separated** with prominent headings, a **dotted branch connector**
links each parent to its dependents (git-graph style), and **dependent toggles disable automatically**
when their prerequisite is off (switch **Export** off and CSV/Excel/Print grey out). Choices are **per
table** and saved to `localStorage`, so they survive reloads. Only
features you've provisioned are listed (default-on data features plus any opt-in feature you enabled),
so users can't switch on something the grid isn't wired for.

```tsx
<BstTableMui
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  enableClipboard          // provisions "Copy & paste" in the sheet
  showSettings             // ⚙ gear → settings sheet (persisted per table)
/>

// Object form — curate + control persistence:
<BstTableMui
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  showSettings={{
    title: 'Table settings',
    features: ['enableSorting', 'enableColumnFilters', 'pagination'], // only these switches
    persistKey: 'people-grid',   // explicit localStorage key (else derived from columns)
    persist: true,               // false → in-memory only
    search: true,                // search box (default: auto for long lists; false hides it)
  }}
/>
```

The same headless model powers both skins — it's the engine's `useBstSettings` hook
([docs](https://www.npmjs.com/package/@bloomskill/table-engine#runtime-settings-sheet)).

### Files columns — images & PDFs

A `files` column (`meta.type: 'files'`) holds attachments; its value is `FileRef[]`
(`{ name?, url?, thumbnailUrl?, contentType? }`). **Images thumbnail automatically** — no setup:

```tsx
const columns = [
  { id: 'photos', accessorKey: 'photos', header: 'Photos', meta: { type: 'files' } },
]
// rows: photos: [{ name: 'logo.png', url: 'https://…/logo.png', contentType: 'image/png' }]
```

**PDF page-1 thumbnails** need pdf.js (the engine never bundles it — you own it + its worker).
Install `pdfjs-dist`, then set `cellMeta.pdfThumbnail: true` on the column and wrap the grid in the
provider:

```tsx
import * as pdfjs from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker' // Vite
import { BstPdfThumbnailerProvider, createPdfjsThumbnailer } from '@bloomskill/table-engine'
import { BstTableMui } from '@bloomskill/table-mui'

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()
const pdfThumbs = createPdfjsThumbnailer(pdfjs)

const columns = [
  { id: 'docs', accessorKey: 'docs', header: 'Docs',
    meta: { type: 'files', cellMeta: { pdfThumbnail: true } } },
]
// rows: docs: [{ name: 'invoice.pdf', url: 'https://…/invoice.pdf', contentType: 'application/pdf' }]

export function App() {
  return (
    <BstPdfThumbnailerProvider renderer={pdfThumbs}>
      <BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} />
    </BstPdfThumbnailerProvider>
  )
}
```

Images in the same column keep thumbnailing; a file with a `thumbnailUrl` skips pdf.js. Without the
provider, `pdfThumbnail: true` is harmless (the PDF keeps its icon). Click any file for a full-size
preview. Full guide + other bundlers' worker setup:
[engine README → Files columns](https://www.npmjs.com/package/@bloomskill/table-engine#files-columns--images--pdfs).

## Props

Extends **every** [`useBstTable` option](https://www.npmjs.com/package/@bloomskill/table-engine#options-reference)
— the engine README's options reference is the authoritative list. In summary:

- **Core** — `data` · `columns` · `getRowId` · `initialState`
- **Data ops** — `enableSorting` · `enableGlobalFilter` · `enableColumnFilters` · `enableColumnFilterRow` ·
  `enableGrouping` · `pagination`
- **Columns & layout** — `enableHiding` · `enableColumnResizing` · `enableColumnPinning` ·
  `enableColumnOrdering` · `fitColumns` · `enableResponsive`
- **Rows** — `enableRowSelection` · `enableRowActions` · `enableExpanding` · `renderDetail` ·
  `getRowCanExpand` · `enableRowPinning` · `enableRowResize` · `createRow` · `tempIdPrefix`
- **Editing** — `enableEditing` · `enableValidation` · `enableBatchEditing` · `enableUndoRedo` ·
  `cellTypes` · `onDataChange` · `onSave`
- **Selection & clipboard** — `enableCellSelection` · `enableClipboard` · `enableCopyColumn` ·
  `enableCopyRow`
- **Access control** — `disabled` · `rowDisabled` · `cellDisabled`
- **Cells & styling** — `enableCellSpanning` · `getCellSpan` · `conditionalFormats` ·
  `enableConditionalFormatting` · `classNames` · `styles`
- **Performance** — `enableVirtualization` · `enableColumnVirtualization` · `onReachEnd` ·
  `endReachedThreshold` (large-data windowing + A2 infinite scroll)
- **Server mode** — `manualSorting` / `manualFiltering` / `manualPagination` / `manualGrouping` ·
  `rowCount` / `pageCount` · `autoResetPageIndex` · `state` · `on*Change` (spread
  `useBstDataSource(...).tableProps` — or `useBstInfiniteDataSource(...).tableProps` — straight in)

Plus the MUI-only chrome props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | — | Optional toolbar title. |
| `showToolbar` | `boolean` | `true` | Show the top toolbar. |
| `showSearch` | `boolean` | `true` | Show the global search box. |
| `showColumnsMenu` | `boolean` | `true` | Show the column-visibility menu. Each column gets a checkbox **and** an **eye / eye-off** hide-toggle (plus pin/reorder/copy/edit controls when those features are on). Requires `enableHiding` (default on). |
| `showPagination` | `boolean` | `true` | Show the pagination bar. |
| `showAddRow` | `boolean` | follows `enableRowActions` | Show the **Add row** button. |
| `showSaveBar` | `boolean` | follows `enableEditing` | Show the unsaved-changes Save/Discard bar. |
| `showChangesSheet` | `boolean` | follows `enableEditing.mode === 'batch'` | "{n} unsaved" chip + **Review & save** button opening a right-hand **Drawer** that lists every unsaved edit (row · column · old → new) with per-change / per-row revert and the final **Save** confirmation — ONE `onSave` call for the whole batch. Replaces the plain save bar while on. |
| `changesRowLabel` | `(row, rowId) => ReactNode` | `Row {rowId}` | Labels a row in the changes sheet (e.g. show the row's name). |
| `showSelectionInfo` | `boolean` | follows `enableRowSelection` | Show the "{n} selected" chip + Clear. |
| `showUndoRedo` | `boolean` | follows `enableUndoRedo` | Show the Undo/Redo buttons. |
| `showDensityToggle` | `boolean` | `false` | Show the row-height density button. |
| `showExport` | `boolean` | follows `enableExport` | Show the Export menu (CSV / Excel / Print). Requires `enableExport`. |
| `showFind` | `boolean` | follows `enableFind` | Show the toolbar **⌕ Find** button — opens the in-grid find bar (highlight + jump; ⌘/Ctrl+F also opens it). Requires `enableFind`. |
| `showStatusBar` | `boolean` | `false` | Show the status-bar footer — row counts + sum/avg/min/max/count of the selected range. |
| `showColumnEditToggle` | `boolean` | `false` | Add a per-column **edit lock/unlock** (✏️) to the Columns menu, so an end-user can make an editable column read-only at runtime. Requires `enableEditing`. |
| `showFilterBuilder` | `boolean` | `false` | Show the Filters button + filter-builder panel. |
| `showFormatBuilder` | `boolean` | `false` | Show the Formats button + conditional-format builder panel. Needs `enableConditionalFormatting` (default on). |
| `onConditionalFormatsChange` | `(rules) => void` | — | Own the builder's rule edits (controlled mode); omit for local, uncontrolled edits. |
| `showSettings` | `boolean \| BstSettingsOptions` | `false` | Gear → a right-side settings **sheet** (Drawer) of per-table feature toggles, persisted to `localStorage`. Object form: `{ features?, title?, persistKey?, persist? }`. |
| `gridState` | `BstGridStateOptions` | — | **Grid-state save/restore.** `{ key: 'orders' }` persists this grid's **view** — sort · filter · column order/size/visibility/pinning · grouping — to `localStorage` and restores it on the next mount (seeds `initialState` + writes changes back, debounced). Full options: `{ key, storage?, persist?, debounceMs?, include?, exclude? }`. Distinct from `showSettings` (which toggles *features*). With `showSettings` on, the settings-sheet footer gains a **Reset view** button, and — in **manual mode** (`persist: false`) — a **Save view** button, so the user persists the arrangement on click instead of automatically. |
| `pageSizeOptions` | `(number \| 'all')[]` | `[5,10,20,50]` | Rows-per-page choices. Include `'all'` (e.g. `[10, 25, 50, 'all']`) for an **All** entry that shows every filtered row — pairs well with `enableStickyHeader` (show all rows, scroll inside a fixed box). |
| `className` | `string` | — | Custom class on the outer card (the whole component). |
| `style` | `CSSProperties` | — | Inline style on the outer card. |

**Custom CSS:** the engine's `classNames` / `styles` slot objects are forwarded to the grid body —
style the root / header / row / cell / … parts, or a whole column via `meta.cellClassName` /
`meta.headerClassName`. See the engine's
[Custom CSS](https://www.npmjs.com/package/@bloomskill/table-engine#custom-css).
Use the adapter's `className` / `style` for the outer card.

**Toggle convention:** `enable*` controls engine behaviour, `show*` controls MUI chrome.
A `show*` no-ops when its `enable*` is off (e.g. `showSearch` requires `enableGlobalFilter`;
`showAddRow` requires `enableRowActions`).

Also exports `createMuiPreset()` / `muiCellTypes` for building or extending the editor registry.

```tsx
// Read-only-ish, no chrome, all rows on one page:
<BstTableMui data={rows} columns={columns} getRowId={(r) => r.id}
  enableSorting={false} showToolbar={false} pagination={false} />
```

## Requirements

React `>= 18` · `@bloomskill/table-engine` · `@mui/material` (v6+) · `@mui/icons-material` · `@emotion/react` · `@emotion/styled` (peer dependencies).

## License

MIT
