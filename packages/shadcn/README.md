# @bloomskill/table-shadcn

[![npm](https://img.shields.io/npm/v/@bloomskill/table-shadcn.svg)](https://www.npmjs.com/package/@bloomskill/table-shadcn)
[![license](https://img.shields.io/npm/l/@bloomskill/table-shadcn.svg)](./LICENSE)

The **shadcn / Radix skin** for Bst-Table. Wraps the headless
[`@bloomskill/table-engine`](https://www.npmjs.com/package/@bloomskill/table-engine)
with a shadcn-style toolbar, a [Radix](https://www.radix-ui.com/) dropdown column menu,
and a pagination bar. **Drops into an existing shadcn app** — `theme="inherit"` adopts your
design tokens and dark mode, and the toolbar icons come from your own icon library
(lucide · Tabler · HugeIcons · Phosphor · Remix) — or crisp built-in SVGs with nothing installed.

Same data and columns as the [MUI skin](https://www.npmjs.com/package/@bloomskill/table-mui),
so you can switch skins without changing your data code.

## Features

- 🧱 **Drop-in shadcn-style grid** — one `<BstTableShadcn />` component.
- 🎛 **Radix DropdownMenu** column-visibility menu; shadcn-style search & pagination.
- ✏️ **Editing (Phase 2)** at MUI parity — native-control editors for the full B-series, a dependency-free **modal** for long-text & file popups (the **files** modal adds **click-to-preview** — images inline · PDFs in the native viewer — and configurable **upload/delete** via `cellMeta.onUpload`/`onDelete`; read cells show image thumbnails and, with `cellMeta.pdfThumbnail` + a `<BstPdfThumbnailerProvider>` (pdf.js), an in-cell **PDF page-1 thumbnail**), **Add row** button + unsaved **Save / Discard** bar, inline error rings. Wired via `createShadcnPreset()`.
- ⌨️ **Selection · keyboard nav · clipboard (Phase 3)** — pass `enableCellSelection` / `enableClipboard`; range selection, Arrow/Tab/Home/End navigation, and copy/paste (TSV) come from the shared grid body, no extra chrome required. The **Columns menu** gains a **Copy-column** button (the pluggable `copy` icon) per column — copies the whole column across **all pages** (also Ctrl/Cmd+Space). Whole-column and whole-row copy are sub-toggles: **`enableCopyColumn`** / **`enableCopyRow`** (both default `true`; Shift+Space copies a row).
- ☑️ **Row selection (Phase 3)** — `enableRowSelection` renders a checkbox column (header select-all + per-row) and a toolbar "{n} selected" badge + Clear (`showSelectionInfo`).
- ↩️ **Undo/redo (Phase 3)** — `enableUndoRedo` adds toolbar Undo/Redo buttons (`showUndoRedo`) wired to the engine's edit history (Ctrl/Cmd+Z / Ctrl/Cmd+Y also work).
- 📌 **Layout chrome (Phase 3)** — `enableColumnPinning` / `enableColumnOrdering` add pin + move controls to the Radix columns menu; `showDensityToggle` cycles row-height density; **`enableRowResize`** lets users drag a row's bottom edge to set its height (double-click to reset). **`showColumnEditToggle`** adds a per-column **edit lock/unlock** (✏️) so an end-user can make an editable column read-only at runtime (requires `enableEditing`).
- 👁️ **Hide / show columns** — with `enableHiding` (on by default) the **Columns menu** gives each column an **eye / eye-off** toggle (the pluggable `eye` / `eyeOff` icon slots) beside the pin/reorder/copy/edit controls — the one-click per-column hide affordance, alongside the existing visibility checkmark. The runtime settings sheet exposes the same capability as **Show / hide columns**.
- 📤 **Export (Phase 5)** — `enableExport` adds a toolbar **Export** menu (`showExport`, a Radix dropdown) — download **CSV**, download **Excel** (`.xlsx`) or **print** — built on the engine's dependency-free serializers (no `exceljs`). Per-format sub-toggles `enableCsvExport` / `enableExcelExport` / `enablePrint`.
- 🔎 **Set Filter (Phase 6, AG4)** — `enableSetFilter` gives categorical columns an Excel-style **checklist of distinct values** in the filter row (search · select-all/clear · counts · (Blanks)); needs `enableColumnFilterRow`.
- 🔎 **Multi-filter (AG11)** — `enableMultiFilter` lets a column **stack filter types** via an array `meta.filter` (e.g. `['condition', 'set']`): the filters render stacked in the row and a row must satisfy all of them (AND). Needs `enableColumnFilterRow`.
- 📊 **Status bar (Phase 6, AG5)** — `showStatusBar` adds a footer with total / filtered row counts and, when a cell range is selected, the **sum / avg / min / max / count** of its numeric cells.
- 🔎 **Filter builder (Phase 3, E3)** — `showFilterBuilder` adds a "Filters (n)" button + a panel with per-column condition rows (operator-aware). Add `enableColumnFilterRow` for a second, inline per-column filter row; drag a header to reorder, drag its edge to resize.
- 🎨 **Conditional-format builder (K3)** — `showFormatBuilder` adds a "Formats (n)" button that opens/closes a panel hosting `<BstConditionalFormatBuilder>`: end-users add / edit / delete `conditionalFormats` rules at runtime (uncontrolled local state by default; pass `onConditionalFormatsChange` to own the rules). Hidden while `enableConditionalFormatting` is off.
- ⚙️ **Settings sheet** — `showSettings` adds a gear that opens a dependency-free right-side **sheet** (shadcn "Sheet" style) where end-users flip this grid's features on/off at runtime (**per table**), saved to `localStorage`. Only provisioned features appear — e.g. turn **Copy & paste** off to disable clipboard, no code change. Honours `dark`.
- 💾 **Grid state save/restore (AG21)** — `gridState={{ key: 'orders' }}` persists this grid's **view** (sort · filter · column order/size/visibility/pinning · grouping) to `localStorage` and restores it on the next mount — a per-user view that survives reloads, in one prop.
- ⌨️ **Keyboard-shortcuts overlay** — `showShortcuts` adds a **"?" button** (also opens on the `?` key) → a theme-aware overlay listing the keyboard shortcuts **active on this grid** (grouped · searchable · ⌘/Ctrl-aware; force with `showShortcuts={{ platform: 'mac' }}`); it shows only what's wired (selection / clipboard / editing / undo).
- 🧹 **Leaner toolbar** — **Add row** sits in a footer bar under the table, and **Undo/Redo · Density · Formats** collapse into a single **"⋯ More"** menu (Radix `DropdownMenu`).
- 🗂️ **Review-changes sheet** — with `enableEditing={{ mode: 'batch' }}` every edit stays an unsaved draft; the toolbar shows **"{n} unsaved" + Review & save**, opening a sheet that lists each edit (**row · column · old → new**) with per-change revert and the final **Save** — which fires **ONE** `onSave` call for the whole batch (cell-wise `changes`, row-wise `rows[].patch`, or grid-wise `next`), never a request per cell. A failed call keeps every draft. End-users can switch batch mode on/off themselves from the ⚙ settings sheet ("Editing" → **Batch editing**, `enableBatchEditing`).
- 🎨 **Themes your shadcn app** — `theme="inherit"` re-points every token at your host shadcn
  variables (`--background` / `--primary` / `--border` / `--ring` / `--radius` + font), in both
  **HSL-channel** and **OKLCH / color** (`tokenFormat`) form. Default is a self-contained **zinc**
  palette (no Tailwind build required).
- 🖼️ **Real icons, not emoji** — inject any icon library via `icons`, with ready-made presets at
  `@bloomskill/table-shadcn/icons/{lucide,tabler,hugeicons,phosphor,remix}`. Unspecified slots use
  built-in lucide-styled SVGs, so a bare grid is crisp with **zero** icon deps.
- 🌗 **Dark mode** follows your ambient `.dark` class (next-themes / shadcn) automatically;
  `dark={true|false}` forces it.
- 🖌️ **Custom CSS** — `className` / `style` on the outer card; the engine's `classNames` / `styles` slots + per-column `meta.cellClassName` / `headerClassName` style the grid body.
- 📈 **In-cell visualization** — `sparkline` (line / area / bar) and `kpi` (value + delta + mini-spark) cell types via `meta.type` — dep-free inline SVG, no charting library.
- 🔳 **QR · barcode · rich-text cells** — `meta.type: 'qr'` / `'barcode'` render dep-free inline-SVG QR codes + Code 128 barcodes; `'richText'` stores sanitized HTML — a plain-text preview by default, or set `cellMeta.render: 'html'` to show it **formatted** in the cell — and edits in a shadcn **modal** with a formatting toolbar. From the shared engine.
- ⋯ **Row action menu** — `meta.type: 'actionMenu'` renders a compact **⋯** kebab popup of the row's
  actions (edit / save / cancel / duplicate / delete), the space-saving alternative to the inline
  `action` buttons. Inherited from the engine preset, styled by the skin.
- 📏 **Column auto-size** — **double-click** any resize handle to fit the column to its content
  (sampled `canvas.measureText`, clamped to `minSize`/`maxSize`). Pair `enableResponsive` with
  `meta.responsivePriority` to drop low-priority columns on narrow screens, or use `fitColumns` to
  remove horizontal scrolling entirely.
- 🚀 **Virtualization + infinite scroll (D1/A2)** — `enableVirtualization` (+ `enableColumnVirtualization`)
  windows rows/columns so a 20k-row grid stays at 60fps with a bounded DOM; `useBstInfiniteDataSource`
  + `onReachEnd` append on scroll. Both flow through the adapter unchanged. (Virtualization yields to
  master-detail / grouping / spanning / row-pinning.)
- 🎨 **Ships its own CSS — no Tailwind build required.** Just import the stylesheet.
- ✅ OOTB sorting · search · pagination · column visibility · resizing, with the same
  `enable*` / `show*` toggles as every Bst-Table skin.

## Install

```bash
npm install @bloomskill/table-shadcn @bloomskill/table-engine \
  @radix-ui/react-dropdown-menu react react-dom
```

Icon-library presets are **optional** — install only the one you use (e.g. `npm i lucide-react`),
or none at all (the built-in SVGs are the default).

## Usage

```tsx
import { BstTableShadcn } from '@bloomskill/table-shadcn'
import type { BstTableColumn } from '@bloomskill/table-engine'
// both stylesheets are required for the shadcn skin:
import '@bloomskill/table-engine/styles.css'
import '@bloomskill/table-shadcn/styles.css'

type Person = { id: string; name: string; role: string; age: number }

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'role', accessorKey: 'role', header: 'Role' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

export function People({ rows }: { rows: Person[] }) {
  return (
    <BstTableShadcn
      title="People"
      data={rows}
      columns={columns}
      getRowId={(r) => r.id}
      pagination={{ pageSize: 10 }}
      dark
    />
  )
}
```

### Editing (Phase 2)

Same API as every skin — opt into editing and own the data with `onDataChange`:

```tsx
const [rows, setRows] = React.useState(seed)

<BstTableShadcn
  title="People"
  data={rows}
  columns={columns /* columns opt in via meta.type + meta.editable */}
  getRowId={(r) => r.id}
  dark
  enableEditing
  enableValidation
  enableRowActions
  onDataChange={setRows}
/>
```

Editors are native controls styled by the shadcn CSS; long-text & file cells open a
lightweight modal, and multi-select cells open a **checkbox-dropdown** popup (toggle
options, commits on close — MUI parity, no extra dependency). Override with a
`cellTypes` registry built from `createShadcnPreset()`.

### Runtime settings sheet

`showSettings` lets **end-users** customize a grid without touching code — a gear slides out a
right-side **Sheet** of feature toggles (dependency-free, honours `dark`) under a **highlighted
header**, with a **search box** to filter the 30+ list. Sections are **divider-separated** with
prominent headings, a **dotted branch connector** links each parent to its dependents (git-graph
style), and **dependent toggles disable automatically** when their prerequisite is off (switch
**Export** off and CSV/Excel/Print grey out). Choices are **per table** and saved to `localStorage`,
so they survive reloads. Only features you've provisioned are listed, so users can't switch on
something the grid isn't wired for.

```tsx
<BstTableShadcn
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  dark
  enableClipboard          // provisions "Copy & paste" in the sheet
  showSettings             // ⚙ gear → settings sheet (persisted per table)
/>

// Object form — curate + control persistence:
<BstTableShadcn
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

### Icons

Toolbar/menu icons are pluggable. Pass a ready-made preset for your library — each lives at its
own subpath, so only the library you import is pulled in:

```tsx
import { BstTableShadcn } from '@bloomskill/table-shadcn'
import { lucideIcons } from '@bloomskill/table-shadcn/icons/lucide'
// or: .../icons/tabler · .../icons/hugeicons · .../icons/phosphor · .../icons/remix

<BstTableShadcn data={rows} columns={columns} getRowId={(r) => r.id} icons={lucideIcons} />
```

Install the matching library (`lucide-react`, `@tabler/icons-react`,
`@hugeicons/react` + `@hugeicons/core-free-icons`, `@phosphor-icons/react`, or `@remixicon/react`).
Override individual slots, or supply your own components — any React icon works:

```tsx
import { Search } from 'lucide-react'
<BstTableShadcn … icons={{ search: Search }} />   // unspecified slots keep the built-in SVGs
```

With no `icons` prop, the grid renders built-in lucide-styled SVGs (zero dependency). Slots:
`search` · `filter` · `format` · `columns` · `chevronLeft` / `chevronRight` / `chevronDown` · `check` ·
`pin` · `plus` · `save` · `undo` · `redo` · `density` · `group` · `settings` · `close` · `copy` · `edit` ·
`eye` / `eyeOff` (the per-column hide/show toggle in the Columns menu).

Your icon set also **themes the grid body** — the overlapping slots (pin, boolean check, expander
chevrons, remove) are forwarded into `<BstTable>`, so the cells match the toolbar. Sort arrows and
file-type icons (no chrome equivalent) use the engine's skin-neutral SVG defaults.

### Theme — match your shadcn app

By default the skin uses a self-contained **zinc** palette (no Tailwind needed) and follows your
ambient `.dark` class. Inside a real shadcn app, set `theme="inherit"` to adopt the host design
tokens instead:

```tsx
// Classic shadcn globals.css (HSL channels):
<BstTableShadcn … theme="inherit" />

// Tailwind v4 / newer shadcn (OKLCH or full-color tokens):
<BstTableShadcn … theme="inherit" tokenFormat="oklch" />
```

`inherit` reads `--background` / `--card` / `--foreground` / `--muted(-foreground)` / `--border` /
`--input` / `--ring` / `--primary(-foreground)` / `--radius` and the host font, so the grid matches
your theme — including dark, which your app's `.dark` class already drives.

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
Install `pdfjs-dist`, set `cellMeta.pdfThumbnail: true` on the column, and wrap the grid in the provider:

```tsx
import * as pdfjs from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker' // Vite
import { BstPdfThumbnailerProvider, createPdfjsThumbnailer } from '@bloomskill/table-engine'
import { BstTableShadcn } from '@bloomskill/table-shadcn'

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
      <BstTableShadcn data={rows} columns={columns} getRowId={(r) => r.id} />
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
  `useBstDataSource(...).tableProps` straight in)

Plus the shadcn-only chrome props:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | — | Optional toolbar title. |
| `theme` | `'zinc' \| 'inherit'` | `'zinc'` | Palette source. `'inherit'` adopts the host shadcn tokens + font. |
| `tokenFormat` | `'hsl' \| 'oklch'` | `'hsl'` | Host token format for `theme="inherit"`: HSL channels vs OKLCH / full-color. |
| `dark` | `boolean` | follows ambient `.dark` | Force dark/light; omitted follows an ancestor `.dark` / `[data-theme="dark"]`. Ignored under `theme="inherit"`. |
| `icons` | `Partial<BstShadcnIcons>` | built-in SVGs | Icon overrides / preset. Unspecified slots use the lucide-styled defaults. |
| `showToolbar` | `boolean` | `true` | Show the top toolbar. |
| `showSearch` | `boolean` | `true` | Show the global search box. |
| `showColumnsMenu` | `boolean` | `true` | Show the Radix column menu. Each column gets a visibility checkbox **and** an **eye / eye-off** hide-toggle (plus pin/reorder/copy/edit controls when those features are on). Requires `enableHiding` (default on). |
| `showPagination` | `boolean` | `true` | Show the pagination bar. |
| `showAddRow` | `boolean` | follows `enableRowActions` | Show the **Add row** button. |
| `showSaveBar` | `boolean` | follows `enableEditing` | Show the unsaved-changes Save/Discard bar. |
| `showChangesSheet` | `boolean` | follows `enableEditing.mode === 'batch'` | "{n} unsaved" chip + **Review & save** button opening a dependency-free right-hand **sheet** that lists every unsaved edit (row · column · old → new) with per-change / per-row revert and the final **Save** confirmation — ONE `onSave` call for the whole batch. Replaces the plain save bar while on. |
| `changesRowLabel` | `(row, rowId) => ReactNode` | `Row {rowId}` | Labels a row in the changes sheet (e.g. show the row's name). |
| `showSelectionInfo` | `boolean` | follows `enableRowSelection` | Show the "{n} selected" chip + Clear. |
| `showUndoRedo` | `boolean` | follows `enableUndoRedo` | Show the Undo/Redo buttons. |
| `showDensityToggle` | `boolean` | `false` | Show the row-height density button. |
| `showExport` | `boolean` | follows `enableExport` | Show the Export menu (CSV / Excel / Print). Requires `enableExport`. |
| `showStatusBar` | `boolean` | `false` | Show the status-bar footer — row counts + sum/avg/min/max/count of the selected range. |
| `showColumnEditToggle` | `boolean` | `false` | Add a per-column **edit lock/unlock** (✏️) to the Radix columns menu, so an end-user can make an editable column read-only at runtime. Requires `enableEditing`. |
| `showFilterBuilder` | `boolean` | `false` | Show the Filters button + filter-builder panel (E3). |
| `showFormatBuilder` | `boolean` | `false` | Show the Formats button + conditional-format builder panel (K3). Needs `enableConditionalFormatting` (default on). |
| `onConditionalFormatsChange` | `(rules) => void` | — | Own the builder's rule edits (controlled mode); omit for local, uncontrolled edits. |
| `showSettings` | `boolean \| BstSettingsOptions` | `false` | Gear → a right-side settings **sheet** of per-table feature toggles, persisted to `localStorage`. Object form: `{ features?, title?, persistKey?, persist? }`. |
| `gridState` | `BstGridStateOptions` | — | **Grid-state save/restore (AG21).** `{ key: 'orders' }` persists this grid's **view** — sort · filter · column order/size/visibility/pinning · grouping — to `localStorage` and restores it on the next mount (seeds `initialState` + writes changes back, debounced). Full options: `{ key, storage?, persist?, debounceMs?, include?, exclude? }`. Distinct from `showSettings` (which toggles *features*). |
| `pageSizeOptions` | `number[]` | `[5,10,20,50]` | Rows-per-page choices. |
| `className` | `string` | — | Custom class on the outer card (added after `sc-card` / `sc-dark`). |
| `style` | `CSSProperties` | — | Inline style on the outer card. |

**Custom CSS:** the engine's `classNames` / `styles` slot objects are forwarded to the grid body —
style the root / header / row / cell / … parts, or a whole column via `meta.cellClassName` /
`meta.headerClassName`. See the engine's
[Custom CSS](https://www.npmjs.com/package/@bloomskill/table-engine#custom-css).
Use the adapter's `className` / `style` for the outer card.

**Toggle convention:** `enable*` controls engine behaviour, `show*` controls chrome.
A `show*` no-ops when its `enable*` is off (e.g. `showColumnsMenu` requires `enableHiding`).

Also exports `createShadcnPreset()` / `shadcnCellTypes` for the editor registry, and
`defaultIcons` / `resolveIcons` / `ICON_SLOTS` (+ the `BstShadcnIcons` type) for building a custom icon map.

```tsx
// Dark, no search box, all rows on one page:
<BstTableShadcn data={rows} columns={columns} getRowId={(r) => r.id}
  dark showSearch={false} pagination={false} />
```

## Requirements

React `>= 18` · `@bloomskill/table-engine` · `@radix-ui/react-dropdown-menu` (v2+) — peer dependencies.
Icon libraries are **optional** peers — install only the one whose preset you import: `lucide-react`,
`@tabler/icons-react`, `@hugeicons/react` + `@hugeicons/core-free-icons`, `@phosphor-icons/react`, or `@remixicon/react`.

## License

MIT
