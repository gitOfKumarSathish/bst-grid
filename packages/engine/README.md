# @bloomskill/table-engine

[![npm](https://img.shields.io/npm/v/@bloomskill/table-engine.svg)](https://www.npmjs.com/package/@bloomskill/table-engine)
[![license](https://img.shields.io/npm/l/@bloomskill/table-engine.svg)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-online-2ea44f.svg)](https://gitofkumarsathish.github.io/bst-grid/)

The **headless engine** for Bst-Table — a small, UI-agnostic React data grid built on
[TanStack Table v9](https://tanstack.com/table/latest). It ships the correct state engine
(sorting, filtering, editing, selection, …) plus a neutral, theme-able renderer with **zero
component-library styling**, so you pair it with a skin:
[`@bloomskill/table-mui`](https://www.npmjs.com/package/@bloomskill/table-mui),
[`@bloomskill/table-shadcn`](https://www.npmjs.com/package/@bloomskill/table-shadcn), or your own.

- 🪶 **Two lightweight deps** — `@tanstack/react-table` + `@tanstack/react-virtual`; `react` / `react-dom` are peers.
- 🎛 **Every feature is a toggle** — data features on by default, heavy features opt-in.
- 🛰️ **One grid, every scale** — the same component runs client-side or against a server `DataSource` (1M rows).

## 📚 Documentation

Full guides, a complete API reference and **live, editable demos** are on the docs site — **[gitofkumarsathish.github.io/bst-grid](https://gitofkumarsathish.github.io/bst-grid/)**:

| Guide | Reference | More |
| :-- | :-- | :-- |
| [Getting Started](https://gitofkumarsathish.github.io/bst-grid/docs/getting-started) | [Feature Guides](https://gitofkumarsathish.github.io/bst-grid/docs/features) | [Styling & Theming](https://gitofkumarsathish.github.io/bst-grid/docs/theming) |
| [Installation](https://gitofkumarsathish.github.io/bst-grid/docs/installation) | [Cell Types](https://gitofkumarsathish.github.io/bst-grid/docs/cell-types) | [AI Agents & MCP](https://gitofkumarsathish.github.io/bst-grid/docs/ai-agents) |
| [Recipes](https://gitofkumarsathish.github.io/bst-grid/docs/recipes) | [API Reference](https://gitofkumarsathish.github.io/bst-grid/docs/api) | [Coverage & Roadmap](https://gitofkumarsathish.github.io/bst-grid/docs/coverage) |

---

## Contents

**Start here**
&nbsp;· [Install](#install)
&nbsp;· [Quick start](#quick-start)
&nbsp;· [Live examples](#live-examples)
&nbsp;· [Feature map](#feature-map)

**Columns** — *how to shape and customize each column*
&nbsp;· [Column reference](#column-reference)
&nbsp;· [`meta` reference](#meta-reference)
&nbsp;· [Cell types](#cell-types)
&nbsp;· [`cellMeta` by cell type](#cellmeta-by-cell-type)
&nbsp;· [Files columns — images & PDFs](#files-columns--images--pdfs)

**Grid options**
&nbsp;· [`useBstTable` options](#options-reference)

**Feature guides** — *use it + customize it*
&nbsp;· [Editing & validation](#editing-and-validation)
&nbsp;· [Batch editing](#batch-editing-and-single-call-save)
&nbsp;· [Selection, keyboard & clipboard](#selection-keyboard-and-clipboard)
&nbsp;· [Access control](#access-control)
&nbsp;· [Row selection](#row-selection)
&nbsp;· [Undo / redo](#undo-and-redo)
&nbsp;· [Filtering](#filtering)
&nbsp;· [Grouping](#grouping-and-aggregation)
&nbsp;· [Column layout](#column-layout)
&nbsp;· [Row layout](#row-layout)
&nbsp;· [Conditional formatting](#conditional-formatting)
&nbsp;· [Cell spanning](#cell-spanning)
&nbsp;· [Custom CSS](#custom-css)
&nbsp;· [Body icons](#body-icons)
&nbsp;· [Runtime settings sheet](#runtime-settings-sheet)
&nbsp;· [Grid state (save / restore views)](#grid-state--save--restore-views-x21)
&nbsp;· [Server mode (DataSource)](#server-mode-datasource)

**Reference** &nbsp;· [Exports](#exports) &nbsp;· [Requirements](#requirements) &nbsp;· [License](#license)

---

## Install

```bash
npm install @bloomskill/table-engine react react-dom
```

`@tanstack/react-table` and `@tanstack/react-virtual` ship as dependencies — you don't install them separately.

## Quick start

> ▶ **[Try it live](https://gitofkumarsathish.github.io/bst-grid/docs/getting-started)** — editable in your browser, no install.

```tsx
import { useBstTable, BstTable, type BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

type Person = { id: string; name: string; age: number }

const data: Person[] = [
  { id: '1', name: 'Ada Lovelace', age: 36 },
  { id: '2', name: 'Linus Torvalds', age: 54 },
]

const columns: BstTableColumn<Person>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name', sortFn: 'alphanumeric' },
  { id: 'age', accessorKey: 'age', header: 'Age', sortFn: 'basic' },
]

export function People() {
  const table = useBstTable({ data, columns, getRowId: (r) => r.id })
  return (
    <div className="bst-table-root">
      <BstTable table={table} />
    </div>
  )
}
```

> **What renders where.** `BstTable` renders the grid **body** — sortable, resizable headers +
> rows. Toolbars, search boxes and pagination bars are **adapter chrome** (MUI / shadcn), or you
> build your own against the returned `table` instance. `.bst-table-root` applies the theme
> variables.

---

## Examples

**Every feature and cell type has a live, editable demo** on the
**[documentation site](https://gitofkumarsathish.github.io/bst-grid/docs/features)** — tweak the code
and watch the grid update, right in the browser, no install.

Prefer a full, cloneable project? Seven standalone starters live in [`examples/`](../../examples)
(`quick-start`, `editing`, `cell-types`, `conditional-formatting`, `cell-spanning`, `server-mode`,
`field-formats`). Run one locally:

```bash
cd examples/quick-start && npm install && npm run dev
```

---

## Feature map

Every capability is a **per-instance toggle**, in one of two layers:

| Prefix | Layer | Resolved in | Example |
| --- | --- | --- | --- |
| **`enable*`** | engine **behaviour** (does the capability run) | `useBstTable` | `enableSorting`, `enableEditing` |
| **`show*`** | adapter **chrome** (does the control render) | the adapter | `showSearch`, `showPagination` |

Data features default **on** (opt-out); heavy/opinionated features (editing, selection, clipboard)
default **off** (opt-in). Pass `boolean` to toggle, or an **options object** to enable *with*
settings (e.g. `pagination={{ pageSize: 25 }}`). Follow a link for the full guide.

#### 🔢 Data operations

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Sorting](#sorting) | `enableSorting` | `true` |
| [Global search](#filtering) | `enableGlobalFilter` | `true` |
| [Find (highlight + jump)](#find) | `enableFind` | `false` |
| [Column filters](#filtering) | `enableColumnFilters` | `true` |
| [Filter builder UI](#filtering) | `<BstFilterBuilder>` / `enableColumnFilterRow` | `false` |
| [Pagination](#pagination) | `pagination` | `true` |
| [Grouping + aggregates](#grouping-and-aggregation) | `enableGrouping` | `false` |

#### 🧱 Columns & layout

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Show / hide columns](#column-layout) | `enableHiding` | `true` |
| [Column resizing](#column-layout) | `enableColumnResizing` | `true` |
| [Auto-size to content](#column-layout) | double-click the resize handle | — |
| [Column pinning](#column-layout) | `enableColumnPinning` | `false` |
| [Column reordering](#column-layout) | `enableColumnOrdering` | `false` |
| [Fit to viewport (no h-scroll)](#column-layout) | `fitColumns` | `false` |
| [Responsive hiding](#column-layout) | `enableResponsive` + `meta.responsivePriority` | `false` |
| [Sticky-header viewport](#row-layout) | `enableStickyHeader` | `false` |
| [Per-column filter row](#filtering) | `enableColumnFilterRow` | `false` |

#### 📋 Rows

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Row selection (checkboxes)](#row-selection) | `enableRowSelection` | `false` |
| [Add / delete / duplicate](#editing-and-validation) | `enableRowActions` | `false` |
| [Master-detail panel](#row-layout) | `enableExpanding` + `renderDetail` | `false` |
| [Row pinning (freeze top/bottom)](#row-layout) | `enableRowPinning` | `false` |
| [Row resizing (drag height)](#row-layout) | `enableRowResize` | `false` |
| [Virtualization (row/column)](#virtualization-d1) | `enableVirtualization` (+ `enableColumnVirtualization`) | `false` |

#### ✏️ Editing

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Inline editing](#editing-and-validation) | `enableEditing` | `false` |
| [Batch editing + one `onSave`](#batch-editing-and-single-call-save) | `enableEditing: { mode: 'batch' }` | `false` |
| [Validation (sync / async / cross-column)](#editing-and-validation) | `enableValidation` | `false` |
| [Undo / redo](#undo-and-redo) | `enableUndoRedo` | `false` |
| [Type-to-edit (spreadsheet entry)](#editing-and-validation) | `enableTypeToEdit` | `false` |

#### ⌨️ Selection & clipboard

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Cell / range selection + keyboard nav](#selection-keyboard-and-clipboard) | `enableCellSelection` | `false` |
| [Copy / paste (TSV)](#selection-keyboard-and-clipboard) | `enableClipboard` | `false` |
| [Copy whole column / row](#selection-keyboard-and-clipboard) | `enableCopyColumn` / `enableCopyRow` | `true` |
| [Access control (disable cascade)](#access-control) | `disabled` · `rowDisabled` · `meta.disabled` · `cellDisabled` | — |

#### 🎨 Cells, styling & scale

| Feature | Turn on with | Default |
| --- | --- | --- |
| [Cell-type registry (17 types)](#cell-types) | `meta.type` | `'text'` |
| [In-cell charts (sparkline / KPI)](#cell-types) | `meta.type: 'sparkline' \| 'kpi'` | — |
| [QR · barcode · rich text](#cell-types) | `meta.type: 'qr' \| 'barcode' \| 'richText'` | — |
| [ERP field formats (Aadhaar · PAN · GSTIN · IBAN · Luhn …)](#cellmeta-by-cell-type) | `cellMeta.pattern` on `text` / `number` | — |
| [Width-aware chips (fit to column)](#cellmeta-by-cell-type) | `cellMeta.fitChips` on `multiSelect` | `false` |
| [File preview + upload/delete (B5/I3)](#cellmeta-by-cell-type) | `meta.type: 'files'` + `cellMeta.onUpload`/`onDelete` · **PDF thumbnail** `cellMeta.pdfThumbnail` | click-to-preview on |
| [Cell spanning (merge cells)](#cell-spanning) | `enableCellSpanning` | `false` |
| [Custom CSS slots](#custom-css) | `classNames` / `styles` | — |
| [Conditional formatting](#conditional-formatting) | `conditionalFormats` + `enableConditionalFormatting` | on when rules present |
| [Injectable body icons](#body-icons) | `icons` | built-in SVGs |
| [Runtime settings sheet](#runtime-settings-sheet) | `useBstSettings` (`showSettings` in adapters) | `false` |
| [Grid state save/restore (X21)](#grid-state--save--restore-views-x21) | `useBstGridState` / `loadGridState` (`gridState={{ key }}` in adapters) | off (opt-in) |
| [Server-side DataSource](#server-mode-datasource) | `useBstDataSource(source)` | client mode |

---

## Column reference

A Bst-Table column is a **TanStack v9 `ColumnDef`** with a typed `meta` slot. Everything
column-specific — the cell type, whether it's editable, formatting, access control, per-column
CSS — lives in `meta`.

```tsx
import type { BstTableColumn } from '@bloomskill/table-engine'

const columns: BstTableColumn<Person>[] = [
  {
    id: 'salary',            // stable column id (used by selection, copy, filters…)
    accessorKey: 'salary',   // key into the row object (or use accessorFn)
    header: 'Salary',        // header content (string or renderer)
    sortFn: 'basic',         // built-in: 'basic' | 'alphanumeric' | 'datetime'
    minSize: 90,             // TanStack sizing (px) — also maxSize / size
    meta: {
      type: 'number',                 // ← selects the cell renderer/editor
      editable: true,                 // ← opt into inline editing
      align: 'right',
      cellMeta: { currency: 'USD', precision: 2 }, // ← per-type settings
    },
  },
]
```

> `header`, `accessorKey`/`accessorFn`, `size`/`minSize`/`maxSize`, `sortFn`, `filterFn`,
> `aggregationFn`, `enableSorting`, `enableHiding`, … are standard **TanStack v9** column fields —
> the [TanStack column docs](https://tanstack.com/table/latest/docs/api/core/column-def) apply.
> The Bst-Table additions all live under **`meta`**.

### `meta` reference

`columnDef.meta` is typed as **`BstColumnMeta`**. Every field is optional.

| Field | Type | Default | What it does |
| --- | --- | --- | --- |
| `type` | `string` | `'text'` | Which [cell type](#cell-types) renders/edits this column. |
| `editable` | `boolean \| (row) => boolean` | `false` | Opt the column into [inline editing](#editing-and-validation) — statically, or per row. |
| `disabled` | `boolean \| (row) => boolean` | — | [Access control](#access-control) (F3/F4): disable the whole column, or per row/cell. A disabled cell is muted and non-editable, but stays selectable/copyable. |
| `options` | [`BstOption[]`](#options-bstoption) | — | Choices for `singleSelect` / `multiSelect` / `radio`. |
| `cellMeta` | `object` | — | [Per-type settings](#cellmeta-by-cell-type) (precision, variant, maxChips, required, …). |
| `format` | `string \| Intl options` | — | Number/date display: shorthand (`'currency'`, `'percent'`) or an `Intl.*FormatOptions` bag. |
| `locale` | `string` | host locale | BCP-47 locale for number / date formatting + parsing. |
| `placeholder` | `string` | — | Placeholder shown in an empty editor. |
| `editMode` | `'inline' \| 'popup'` | cell-type default | Force in-cell vs. dialog editing for this column. |
| `validate` | `(value, ctx) => FieldError[] \| Promise<…>` | — | Column [validator](#editing-and-validation); runs after the cell-type validator. `ctx.getSiblingValue(id)` enables cross-column rules; return a `Promise` for async. |
| `align` | `'left' \| 'center' \| 'right'` | `'left'` | Text alignment for read + edit. |
| `cellClassName` | `(props) => string \| undefined` | — | [Conditional](#conditional-formatting) class on the body cell (K1/K3). |
| `cellStyle` | `(props) => CSSProperties \| undefined` | — | Conditional inline style / CSS vars on the body cell. |
| `headerClassName` | `string` | — | Extra class on this column's header `<th>`. |
| `headerStyle` | `CSSProperties` | — | Inline style / CSS vars on this column's header `<th>`. |
| `rowSpan` | `'group'` | — | [Cell spanning](#cell-spanning) (A5): auto-merge vertically-consecutive equal values. Needs `enableCellSpanning`. |
| `responsivePriority` | `number` | `0` | [Responsive hiding](#column-layout) (G4): higher stays visible longer. Needs `enableResponsive`. |
| `actions` | `{ edit?, delete?, duplicate?, view? }` | `{ edit, delete }` | Which buttons the `action` / `actionMenu` cell renders (B10). |

### Cell types

> ▶ **[See every cell type live](https://gitofkumarsathish.github.io/bst-grid/docs/cell-types)** — editable demos, no install.

Pick the renderer + editor with **`meta.type`**. Read renderers are dependency-free and run on the
hot path; the MUI / shadcn adapters supply richer **editors** for the same types via their presets.

| `meta.type` | Renders | Value shape | Editable | Notable `cellMeta` |
| --- | --- | --- | --- | --- |
| `text` *(default)* | single-line text, ellipsis + title tooltip | `string` | ✅ input | `required`, `pattern` |
| `longText` | clamped multi-line text | `string` | ✅ textarea → popup (adapters) | `required` |
| `number` | locale number / currency / percent | `number \| null` | ✅ number input | `precision`, `currency`, `useGrouping`, `required`, `pattern` |
| `dateTime` | date / time / datetime | `string \| Date \| null` | ✅ native picker | `variant`, `required` |
| `boolean` | check ✓ / muted dash | `boolean` | ✅ checkbox | — |
| `singleSelect` | badge (color · icon · avatar) | `string \| null` | ✅ dropdown | via `meta.options` |
| `multiSelect` | chips + `+N more` overflow | `string[]` | ✅ checkbox dropdown | `maxChips`, `fitChips` |
| `radio` | badge | `string \| null` | ✅ radio group | `layout` |
| `hyperlink` | anchor | `string` or `{ href, label }` | ✅ url input | `target` |
| `files` | image thumbnail / **PDF thumbnail** (`pdfThumbnail`) / icon + name · **click to preview** (image inline, PDF native viewer) | `FileRef[]` (`{ name, url, thumbnailUrl?, contentType? }`) | popup: add/remove (adapters) | `preview`, `pdfThumbnail`, `onUpload`, `onDelete`, `accept` |
| `sparkline` | inline SVG line / area / bar | `number[]` (or `"1,2,3"`) | read-only | `variant`, `width`, `height`, `color`, `min`, `max`, `showValue` |
| `kpi` | value + trend delta chip + mini-spark | `number` or `{ value, delta?, data? }` | read-only | `invertDelta`, `deltaPercent`, `sparkWidth` |
| `qr` | inline-SVG QR code (byte mode, v1–10) | `string` | ✅ input | `ecLevel`, `size`, `margin` |
| `barcode` | inline-SVG Code 128 | `string` | ✅ input | `height`, `showText` |
| `richText` | sanitized-HTML preview or formatted | HTML `string` | ✅ toolbar → popup (adapters) | `render` |
| `action` | inline Edit / Save / Copy / Delete buttons | — | — | via `meta.actions` |
| `actionMenu` | compact **⋯** kebab → actions popup | — | — | via `meta.actions` |

> **Bring your own type.** Register custom renderers/editors with `createCellTypeRegistry` +
> `defineCellType` and pass them as `cellTypes` (adapters start from `createMuiPreset()` /
> `createShadcnPreset()` — extend those). See [Exports](#exports).

### `cellMeta` by cell type

`meta.cellMeta` is free-form per-type settings. A field common to **every editable type** is
`required` (a non-empty check the [validator](#editing-and-validation) enforces). The rest:

**`text` / `number` — field formats (ERP, Frappe-style).** `cellMeta.pattern` applies a named
**validation + input-mask + normalizer** preset — the identity / finance fields an ERP form needs,
validated and masked without a hand-written `validate` per column:

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `pattern` | preset name · `RegExp` · `FieldFormat` | Validate + mask + normalize the cell as that format. |
| `patternMessage` | `string` | Error message to show when `pattern` is a bare `RegExp`. |

Built-in names: `aadhaar` (12-digit, **Verhoeff** checksum, masked `#### #### ####`) · `pan` ·
`gstin` (15-char, **mod-36** checksum) · `tan` · `ifsc` · `email` · `phone` (India mobile) ·
`pincode` · `url` · `upi` · `passport` · `iec` · `esic` (17-digit) · `pf` (12-digit UAN) ·
`iban` (**mod-97** checksum, grouped) · `swift` (BIC) · `creditCard` (**Luhn**, grouped). Register
your own with `defineFieldFormat` or by adding to `FIELD_FORMATS`; the checksum/structure validators
(`isValidAadhaar`, `isValidGstin`, `isValidIban`, `luhnValid`, `verhoeffValid`, …) are exported for
use outside the grid too.

```ts
{ id: 'pan',     meta: { type: 'text',   editable: true, cellMeta: { pattern: 'pan' } } }
{ id: 'aadhaar', meta: { type: 'number', editable: true, cellMeta: { pattern: 'aadhaar' } } }
```

**`number`** — also honours `meta.format` (`'currency'` / `'percent'` / `Intl.NumberFormatOptions`) and `meta.locale`.

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `precision` | `number` | Fixed min+max fraction digits. |
| `currency` | `string` (ISO 4217) | Currency format, e.g. `'USD'`, `'INR'`. |
| `useGrouping` | `boolean` | Thousands separators on/off. |

**`dateTime`** — also honours `meta.format` (`Intl.DateTimeFormatOptions`) and `meta.locale`.

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `variant` | `'date' \| 'time' \| 'dateTime'` | Picker + display mode. Default `'date'`. |

**`multiSelect`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `maxChips` | `number` | Max chips before `+N more`. Default `3`. |
| `fitChips` | `boolean` | Width-aware: show as many chips as the column width fits, fold the rest into `+N more` (widen → more chips). `maxChips` then acts as an upper cap. |

**`radio`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `layout` | `'vertical' \| 'horizontal'` | Radio arrangement. Default `'vertical'`. |

**`hyperlink`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `target` | `string` | Anchor `target`. Default `'_blank'`. |

**`files`** — an attachments cell (images, PDFs, any file). The full how-to is
[**Files columns — images & PDFs**](#files-columns--images--pdfs) below; in short, the value is a
`FileRef[]`, image files thumbnail automatically, and PDFs thumbnail once you wire pdf.js.

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `preview` | `boolean` | Click-to-preview. Default `true` (a file needs a `url` to preview). |
| `pdfThumbnail` | `boolean \| PdfThumbnailRenderer` | Render PDFs as an in-cell page-1 thumbnail via **pdf.js**. `true` uses the renderer from `<BstPdfThumbnailerProvider>`; a function is a per-column renderer. Default `false`. Falls back to the icon with no renderer; `thumbnailUrl` wins when present. |
| `onUpload` | `(file: File) => FileRef \| Promise<FileRef>` | Called for each picked file — upload it and return the stored ref (busy state shown). Without it, the editor keeps a local object URL so preview still works offline. |
| `onDelete` | `(file: FileRef) => void \| Promise<void>` | Called before a file is removed (e.g. delete it on the server). |
| `accept` / `multiple` | `string` / `boolean` | Passed to the file `<input>`. |

**`sparkline`** — value is `number[]` (or a comma string).

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `variant` | `'line' \| 'area' \| 'bar'` | Chart style. Default `'line'`. |
| `width` / `height` | `number` | SVG size in px. Default `84 × 22`. |
| `color` | CSS color | Stroke/fill. Default the accent var. |
| `min` / `max` | `number` | Fix the value scale (else auto from data). |
| `showValue` | `boolean` | Append the last value as text. |

**`kpi`** — value is `number` or `{ value, delta?, data? }`; number formatting from `meta` applies.

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `invertDelta` | `boolean` | Treat a *decrease* as good (green). |
| `deltaPercent` | `boolean` | Render the delta as a percentage. |
| `sparkWidth` | `number` | Width of the optional mini-spark (from `value.data`). |

**`qr`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `ecLevel` | `'L' \| 'M' \| 'Q' \| 'H'` | Error-correction level. Default `'M'`. |
| `size` | `number` | Rendered px. Default `88`. |
| `margin` | `number` | Quiet-zone modules. Default `2`. |

**`barcode`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `height` | `number` | Bar height in px. Default `38`. |
| `showText` | `boolean` | Print the value under the bars. Default `true`. |

**`richText`**

| `cellMeta` | Type | Effect |
| --- | --- | --- |
| `render` | `'text' \| 'html'` | `'text'` (default) = safe one-line plain preview; `'html'` = show the *sanitized* HTML **formatted** (bold / lists / …). |

### Options (`BstOption`)

`meta.options` feeds `singleSelect` / `multiSelect` / `radio`. The value stored is `option.value`;
everything else is presentation.

```tsx
meta: {
  type: 'singleSelect',
  editable: true,
  options: [
    { value: 'todo', label: 'To do',       color: '#94a3b8' },
    { value: 'wip',  label: 'In progress',  color: '#f59e0b', icon: <Clock /> },
    { value: 'done', label: 'Done',         color: '#22c55e', avatar: '/u/ada.png' },
  ],
}
```

| Field | Type | Purpose |
| --- | --- | --- |
| `value` | `string` | Stored value (required). |
| `label` | `string` | Display text (defaults to `value`). |
| `color` | CSS color | Swatch dot / badge tint. |
| `icon` | `ReactNode` | Leading icon. |
| `avatar` | `string` (url) | Small round image. |
| `image` | `string` (url) | Free-form image. |
| `description` | `string` | Secondary text (rich editors). |
| `disabled` | `boolean` | Non-selectable option. |

<a id="files-columns--images--pdfs"></a>

### Files columns — images & PDFs

The `files` cell (`meta.type: 'files'`) holds one or more attachments. The value is a **`FileRef[]`**:

```ts
type FileRef = {
  name?: string          // label; also used to infer the file type from the extension
  url?: string           // link to the file — needed for click-preview AND PDF thumbnails
  thumbnailUrl?: string  // OPTIONAL pre-made image (e.g. a server thumbnail) — always wins
  contentType?: string   // e.g. 'image/png', 'application/pdf' — the most reliable type hint
}
```

**What renders**, decided per file, in this order:

1. a `thumbnailUrl` → a plain `<img>` (use this for server-generated thumbnails of anything);
2. else an **image** (`contentType: image/*`, or a `.png/.jpg/.gif/.webp/.svg…` name) → `<img src={url}>`;
3. else a **PDF** with `pdfThumbnail` on **and** a renderer available → a pdf.js page-1 render;
4. else the **file-type icon + name**.

Clicking any file opens a **preview** overlay (images inline, PDFs in the browser's native viewer).

#### Image column — zero setup

Images thumbnail automatically. Just give each file a `url` (or a `thumbnailUrl`):

```tsx
const columns = [
  { id: 'photos', accessorKey: 'photos', header: 'Photos', meta: { type: 'files' } },
]
const rows = [
  { id: '1', photos: [{ name: 'logo.png', url: 'https://cdn.example/logo.png', contentType: 'image/png' }] },
]
```

#### PDF column — page-1 thumbnails (needs pdf.js)

A PDF shows a **type icon** by default. To render page 1 as a thumbnail: **(1)** turn on
`cellMeta.pdfThumbnail`, and **(2)** provide a **pdf.js** renderer. The engine never bundles pdf.js —
you own it and its worker, so it fits your bundler and stays out of everyone else's build.

**1. Install pdf.js**

```bash
npm install pdfjs-dist
```

**2. Create a renderer once and wrap your tables in the provider** (works with any adapter):

```tsx
import * as pdfjs from 'pdfjs-dist'
import PdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker' // Vite (other bundlers below)
import { BstPdfThumbnailerProvider, createPdfjsThumbnailer } from '@bloomskill/table-engine'

pdfjs.GlobalWorkerOptions.workerPort = new PdfWorker()
const pdfThumbs = createPdfjsThumbnailer(pdfjs)

export function App() {
  return (
    <BstPdfThumbnailerProvider renderer={pdfThumbs}>
      <BstTableMui data={rows} columns={columns} />   {/* or BstTableShadcn / <BstTable> */}
    </BstPdfThumbnailerProvider>
  )
}
```

**3. Turn the thumbnail on for the column** (each PDF needs a `url`):

```tsx
const columns = [
  {
    id: 'docs', accessorKey: 'docs', header: 'Docs',
    meta: { type: 'files', cellMeta: { pdfThumbnail: true } },
  },
]
const rows = [
  { id: '1', docs: [{ name: 'invoice.pdf', url: 'https://files.example/invoice.pdf', contentType: 'application/pdf' }] },
]
```

Done — in the same column, images still thumbnail as `<img>` and PDFs render page 1. A file with a
`thumbnailUrl` skips pdf.js entirely. Without a provider, `pdfThumbnail: true` is harmless (the PDF
keeps its icon).

**Notes**

- **Worker setup by bundler.** Vite: `?worker` (above). webpack 5 / Next.js:
  `pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()`.
- **Lazy-load pdf.js** (keep it out of your initial bundle): pass a loader —
  `createPdfjsThumbnailer(() => import('pdfjs-dist'))` — so pdf.js is fetched when the first thumbnail renders.
- **Per-column renderer** (instead of the provider): `cellMeta.pdfThumbnail: pdfThumbs`.
- `createPdfjsThumbnailer(pdfjs, opts?)` options: `scale` (crispness, default 1.5), `cache` (default true).
- **Upload / delete** files with `cellMeta.onUpload` / `onDelete` (see the `files` row in
  [cellMeta by cell type](#cellmeta-by-cell-type)); the full-size preview overlay is exported as `BstFilePreview`.

---

## Options reference

All options for `useBstTable(options)`, grouped. Types shown are the engine's; a `boolean | {…}`
means *passing the object implies enabled*.

**Core**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `data` | `TData[]` | — | Row data (keep the reference stable between renders). |
| `columns` | `BstTableColumn<TData>[]` | — | Column definitions. |
| `getRowId` | `(row, index) => string` | index | Stable row identity — **required** for editing/selection, recommended always. |
| `initialState` | `object` | — | Extra TanStack initial state (`sorting`, `columnFilters`, `grouping`, …). |

**Data operations**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableSorting` | `boolean` | `true` | Column sorting (v9). |
| `enableGlobalFilter` | `boolean` | `true` | Global search. |
| `enableColumnFilters` | `boolean` | `true` | Per-column filtering / filter builder. |
| `enableSetFilter` | `boolean` | `false` | [Set Filter](#filtering) (X4) — a distinct-values checklist per column in the filter row. Needs `enableColumnFilters` + `enableColumnFilterRow`. |
| `enableMultiFilter` | `boolean` | `false` | [Multi-filter](#filtering) (X11) — a column with an array `meta.filter` (e.g. `['condition','set']`) stacks those filters (AND). Needs `enableColumnFilters` + `enableColumnFilterRow`. |
| `enableGrouping` | `boolean` | `false` | Multi-column [grouping](#grouping-and-aggregation) + aggregates. |
| `pagination` | `boolean \| { pageSize?: number }` | `true` (10) | Pagination; `false` shows all rows. |

**Columns & layout**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableHiding` | `boolean` | `true` | Column show/hide. |
| `enableColumnResizing` | `boolean` | `true` | Column resizing. |
| `enableColumnPinning` | `boolean` | `false` | Sticky column pinning (`{ start, end }`). |
| `enableColumnOrdering` | `boolean` | `false` | Column reorder (menu + header drag). |
| `fitColumns` | `boolean` | `false` | Fit all columns to the viewport — no horizontal scroll (G3). |
| `enableResponsive` | `boolean` | `false` | Hide lowest-priority columns when narrow (G4). No-op under `fitColumns`. |
| `enableStickyHeader` | `boolean \| { maxHeight?: number \| string; maxRows?: number }` | `false` | Cap the body to a bounded height so rows scroll under a pinned header + filter row (G3/G4). `maxHeight` = px number / CSS length; `maxRows` = approx row count; default 440px. Skipped when `enableVirtualization` is on (it already does this). |
| `enableColumnFilterRow` | `boolean` | `false` | Per-column filter inputs under the header. |
| `enableRowNumbers` | `boolean` | `false` | [Row-number column](#row-numbers-auto-columns--overlays) (X9) — a leading `#` column numbering the current view (continuous across pages; reflects sort + filter). Non-interactive; **pinned sticky-left by default** (stays leftmost even when other columns are pinned); stays out of sort / filter / columns menu / export. |
| `rowNumberHeader` | `ReactNode` | `'#'` | Header for the row-number column. |
| `enableAutoColumns` | `boolean` | `false` | [Auto-generate columns](#row-numbers-auto-columns--overlays) (X27) — infer columns from the data when `columns` is empty. Ignored once `columns` is non-empty. |
| `autoColumns` | `AutoColumnsOptions` | — | Tune auto-generation: `{ sampleRows?, include?, exclude?, header?, inferType? }`. |

**Rows**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableRowSelection` | `boolean` | `false` | Row-selection checkbox column (v9). |
| `enableRowActions` | `boolean` | `false` | Row add/delete/duplicate. |
| `enableExpanding` | `boolean` | `false` | [Master-detail](#row-layout) (A4). |
| `renderDetail` | `(row) => ReactNode` | — | Detail-panel content (needs `enableExpanding`). |
| `getRowCanExpand` | `(row) => boolean` | all rows | Which rows can expand. |
| `enableRowPinning` | `boolean` | `false` | Freeze rows top/bottom (G1). |
| `enableRowResize` | `boolean` | `false` | Drag a row's bottom edge to set its height (G2). |
| `enableAutoRowHeight` | `boolean` | `false` | [Auto row height](#row-layout) (X26) — cells wrap and rows grow to fit content; per-column via `meta.wrapText`. |
| `enableVirtualization` | `boolean \| VirtualizationOptions` | `false` | [Row virtualization](#virtualization-d1) (D1) — window visible rows for large data. Object tunes `overscan` / `estimateRowSize` / `estimateColumnSize`. |
| `enableColumnVirtualization` | `boolean` | `false` | Also window columns (needs `enableVirtualization`). |
| `onReachEnd` | `() => void` | — | Infinite scroll (A2) — fires near the end of a virtualized body. |
| `endReachedThreshold` | `number` | `8` | Rows-from-end that trigger `onReachEnd`. |
| `createRow` | `() => Partial<TData>` | — | Blank-row factory for Add row. |
| `tempIdPrefix` | `string` | `'tmp_'` | Prefix for created/duplicated row ids. |

**Editing, validation & saving**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableEditing` | `boolean \| { mode?: 'cell'\|'row'\|'batch'; saveOn?; policy? }` | `false` | [Inline editing](#editing-and-validation). `mode: 'batch'` → [drafts + one `onSave`](#batch-editing-and-single-call-save). |
| `enableValidation` | `boolean \| { policy? }` | `false` | Validation feature. |
| `enableBatchEditing` | `boolean` | follows `enableEditing.mode` | Runtime switch: `true` forces batch, `false` forces per-cell. The flag the settings sheet toggles. |
| `enableUndoRedo` | `boolean` | `false` | [Undo/redo](#undo-and-redo) of committed changes. Needs `onDataChange`. |
| `cellTypes` | `CellTypeRegistry` | neutral defaults | Cell-type registry (adapters pass a preset). |
| `onDataChange` | `(next: TData[]) => void` | — | Controlled write-back on edit/add/delete/duplicate. |
| `onCellCommit` | `(change: BstCellEdit<TData>) => void` | — | Per-cell commit hook — the inline counterpart to `onSave`. Fires once per committed cell (Enter/blur in `cell` mode, or per pasted cell) with the single old → new edit. |
| `enableEditLog` | `boolean` | `false` | Debug: `console.log` each committed cell edit when no `onCellCommit`. Needs `enableEditing`. |
| `onSave` | `(event: BstSaveEvent) => void \| BstSaveResult \| Promise<…>` | — | Batched save hook — **one call per save action**. Rejecting keeps every draft; **returning a `BstSaveResult`** reconciles the server's response — apply authoritative values + flag partial failures (I4). |

**Selection & access control**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableCellSelection` | `boolean` | `false` | [Cell/range selection](#selection-keyboard-and-clipboard) + keyboard nav. |
| `enableTypeToEdit` | `boolean` | `false` | [Type-to-edit](#editing-and-validation): type on a selected cell to overwrite; **Enter/Tab commit & move**. Needs `enableEditing` + `enableCellSelection`. |
| `enableClipboard` | `boolean` | `false` | Copy/paste. Implies `enableCellSelection`; paste needs `enableEditing`. |
| `enableCopyColumn` / `enableCopyRow` | `boolean` | `true` | Sub-toggles of clipboard for whole-column / whole-row copy. |
| `enableContextMenu` | `boolean` | `false` | [Right-click menu](#selection-keyboard-and-clipboard) (X6) — Copy / Export / Autosize defaults; customize via `getContextMenuItems`. |
| `enableFind` | `boolean \| BstFindOptions` | `false` | [Find](#find) (X8) — search box that **highlights matches + jumps between them** (⌘/Ctrl+F · Enter/F3 cycle · Esc close), **without hiding rows**. Object form: `{ caseSensitive?, scope?: 'view' \| 'all' }`. |
| `disabled` | `boolean` | `false` | Disable the whole grid (F1). |
| `rowDisabled` | `(row) => boolean` | — | Disable interaction per row (F2). |
| `cellDisabled` | `({ row, rowId, columnId }) => boolean` | — | Disable interaction per cell (F4). |

**Export (X1–X3)**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableExport` | `boolean \| BstExportOptions` | `false` | [Export](#export-csv--excel--print) as CSV / Excel / print. Object form: `{ csv?, excel?, print?, fileName?, scope?, includeHeaders? }` (an object implies enabled). |
| `enableCsvExport` / `enableExcelExport` / `enablePrint` | `boolean` | `true` | Per-format sub-toggles of `enableExport` (also the settings-sheet switches). |

**Loading / error overlays (X23)**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableOverlays` | `boolean` | `true` | [Loading / error overlays](#row-numbers-auto-columns--overlays) — paint an overlay while `loading` or on `error`. Set `false` to manage those states yourself. |
| `loading` | `boolean` | — | Show the loading overlay. Usually wired from `useBstDataSource(...).loading`. |
| `error` | `ReactNode \| Error \| null` | — | Show the error overlay (error wins over loading). Usually `useBstDataSource(...).error`. |
| `overlayText` | `{ loading?: string; error?: string }` | — | Override the default labels ("Loading…" / the error message). |
| `renderLoadingOverlay` | `() => ReactNode` | — | Fully custom loading overlay. |
| `renderErrorOverlay` | `(error) => ReactNode` | — | Fully custom error overlay. |

**Cells & styling**

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `enableCellSpanning` | `boolean` | `false` | [Merge cells](#cell-spanning) across columns/rows (A5). |
| `getCellSpan` | `(ctx) => { colSpan?, rowSpan? }` | — | Explicit span for an origin cell. |
| `conditionalFormats` | `BstFormatRule[]` | — | [Conditional formatting](#conditional-formatting) rules (K3/F5). |
| `enableConditionalFormatting` | `boolean` | `true` | Runtime off-switch for `conditionalFormats`. |
| `classNames` | `BstClassNames<TData>` | — | [Custom class names](#custom-css) per structural slot. |
| `styles` | `BstStyles<TData>` | — | Inline styles / CSS vars per structural slot. |

**Server mode** (usually supplied by [`useBstDataSource`](#server-mode-datasource))

| Option | Type | Description |
| --- | --- | --- |
| `manualSorting` / `manualFiltering` / `manualPagination` / `manualGrouping` | `boolean` | Run that operation server-side. |
| `rowCount` / `pageCount` | `number` | Total rows / pages (drives the page count). |
| `autoResetPageIndex` | `boolean` | Whether to jump back to page 0 when the data or filters change. `useBstDataSource` sets this for you — turn it off to keep the user's page across a refetch. |
| `state` | `object` | Controlled `{ sorting, columnFilters, globalFilter, pagination }`. |
| `on*Change` | `(updater) => void` | Controlled-state callbacks — `onSortingChange` · `onColumnFiltersChange` · `onGlobalFilterChange` · `onPaginationChange` · `onGroupingChange` · `onExpandedChange`. |

Built-in `sortFn`s: `basic` · `alphanumeric` · `datetime`. Built-in `filterFn`s: `includesString` ·
`inNumberRange` · `bstCondition` (the operator-aware default).

---

## Editing and validation

> ▶ **[Run it live](https://gitofkumarsathish.github.io/bst-grid/docs/features/editing/enableEditing)** — editable demo, no install.

**Use it.** Editing is opt-in and controlled: pass `enableEditing` + an `onDataChange` handler that
owns `data`. Columns opt in per-column with `meta.editable` and pick an editor with `meta.type`.

```tsx
const columns: BstTableColumn<Task>[] = [
  { id: 'title', accessorKey: 'title', header: 'Title',
    meta: { type: 'text', editable: true, cellMeta: { required: true } } },
  { id: 'points', accessorKey: 'points', header: 'Points',
    meta: { type: 'number', editable: true } },
  { id: 'status', accessorKey: 'status', header: 'Status',
    meta: { type: 'singleSelect', editable: true, options: [
      { value: 'todo', label: 'To do' }, { value: 'done', label: 'Done', color: '#22c55e' },
    ] } },
  { id: 'actions', header: '', meta: { type: 'action', actions: { edit: true, delete: true, duplicate: true } } },
]

const table = useBstTable<Task>({
  data: rows, columns, getRowId: (r) => r.id,
  onDataChange: setRows,   // write-back by rowId lands here
  enableEditing: true,     // double-click a cell; Enter commits, Esc cancels
  enableValidation: true,
  enableRowActions: true,
  createRow: () => ({ title: '', points: 0, status: 'todo' }),
})
```

**Customize.**

- **Editing mode** — `enableEditing: { mode }`:
  - `'cell'` *(default)* — each cell commits on its own.
  - `'row'` — the action column's **Edit → Save** defers every cell edit until the row is saved (C2 ≡ I2).
  - `'batch'` — every edit stays a draft until an explicit save → see [Batch editing](#batch-editing-and-single-call-save).
- **Save timing** — `saveOn: 'enter' | 'blur' | 'explicit'` (array allowed). Default `['enter','blur']`.
- **Type-to-edit** — `enableTypeToEdit` (needs `enableCellSelection`) turns on spreadsheet-style entry:
  **type on a selected cell to overwrite** it (the first keystroke seeds the editor via the cell type's
  `parse`, so text and number cells work), then **Enter** commits and moves down (⇧ up) and **Tab**
  commits and moves right (⇧ left). Non-text editors (dropdowns, date pickers) and keys the cell type
  can't represent are left to double-click / F2.
- **Per-cell change hook** — pass `onCellCommit(change)` to be notified the moment each cell commits (edit + click out, or paste) with the single old → new `BstCellEdit` — the inline counterpart to the batch `onSave`. For a zero-wiring debug trace, set `enableEditLog` to `console.log` every commit.
- **Invalid-commit policy** — `policy: 'blockCommitOnError'` (keep the value a dirty draft, default) or `'commitButFlag'` (write it, but flag it).
- **Validation** runs in order: the cell-type validator → the `required` check (`cellMeta.required`)
  → your `meta.validate(value, ctx)`. Cross-column rules read siblings via `ctx.getSiblingValue(id)`;
  return a `Promise<FieldError[]>` for async (last-write-wins, superseded runs abort via `ctx.signal`).
- **Popup vs inline** — a cell type can default to a dialog editor; force it per column with `meta.editMode: 'popup' | 'inline'`.
- **Programmatic control** — use `useBstGrid(options)` → `{ table, runtime, registry }` for
  `runtime.commitAll()`, `getDirtyChanges()`, `addRow()`, etc.
- **Portalled editors** — if your editor opens an overlay outside the cell (a `Select` menu, a
  date-picker popper), set `overlayEditor: true` on the `CellType` so opening it doesn't trigger
  commit-on-blur; the editor then self-commits (`commit(v)` on change / `commit()` on close).

Adapters ship richer editors for these types via `createMuiPreset()` / `createShadcnPreset()`.

## Batch editing and single-call save

**Use it.** When per-cell writes are too chatty for your backend, put the grid in **batch mode**:
every edit — typed or pasted — stays an unsaved draft, and nothing reaches `onDataChange` until an
explicit save. That save announces the **whole batch through `onSave` exactly once**.

```tsx
const { table, runtime } = useBstGrid<Task>({
  data: rows, columns, getRowId: (r) => r.id,
  enableEditing: { mode: 'batch' },   // every commit defers to a draft
  onDataChange: setRows,              // applied AFTER onSave resolves
  onSave: async ({ changes, rows, next }) => {
    // ONE request, your pick of granularity:
    //   changes      → [{ rowId, columnId, field, oldValue, newValue, oldText, newText }]
    //   rows[].patch → { field: newValue } per changed row (ready for a bulk PATCH)
    //   next         → the full next data array
    await api.batchUpdate(rows.map((r) => ({ id: r.rowId, ...r.patch })))
  },
})
```

**Customize.**

- **Review before saving** — `runtime.getChangeSet()` lists every pending edit as `oldValue`/`newValue`
  - formatted `oldText`/`newText`. Adapters render this as the **review-changes sheet**.
- **Revert** — `runtime.revertCell(rowId, columnId)` · `runtime.revertRow(rowId)` · `runtime.cancelAll()`.
- **Save** — `runtime.commitAll()` validates (blocking errors abort under `blockCommitOnError`), calls
  `onSave` once, **then** writes through `onDataChange`. A thrown/rejected `onSave` writes nothing and
  keeps every draft — the user fixes connectivity and retries.
- **Row mode too** — `onSave` also fires (with just that row's changes) when a `mode: 'row'` session
  saves, so both deferred modes share one contract. Plain cell mode has no drafts → use `onDataChange`.
- **Let end-users switch it** — `enableBatchEditing` overrides the mode at runtime; it's the toggle
  the [settings sheet](#runtime-settings-sheet) exposes under **Editing → Batch editing**.

**Reconcile the server's response (I4).** `onSave` may **return** a `BstSaveResult` to fold the
backend's answer back into the grid — think `Promise.allSettled`, not resolve-vs-reject: *throwing*
still aborts the whole save, while *returning* settles each row.

```tsx
onSave: async ({ rows }) => {
  const res = await api.batchUpdate(rows.map((r) => ({ id: r.rowId, ...r.patch })))
  return {
    // accepted rows — the grid adopts the server's OFFICIAL values (ids, timestamps,
    // recomputed/normalised fields), not what was typed; these drafts clear:
    applied: res.saved.map((r) => ({ rowId: r.id, values: r })),
    // rejected rows/cells — draft KEPT + error shown (omit columnId for a whole-row
    // failure); every other changed row still commits:
    failed: res.errors.map((e) => ({ rowId: e.id, columnId: e.field, error: e.message })),
  }
}
```

- **Return nothing** → the default: every draft commits with the typed value (backward-compatible).
- **`applied`** → those rows adopt the server's `values` (a full or **partial** row, merged), so the
  grid shows what was actually stored — no drift. A new row's temporary id maps to the real id here.
- **`failed`** → those rows/cells keep their draft and light up with the `error` (the validation-error
  UI). `commitAll()` resolves `false` when anything failed, so the review sheet stays open on them.

## Selection, keyboard and clipboard

**Use it.** Two opt-in flags add Excel-like productivity through the same neutral `<BstTable/>` body,
so every adapter inherits them.

```tsx
const table = useBstTable<Task>({
  data: rows, columns, getRowId: (r) => r.id, onDataChange: setRows,
  enableEditing: true,        // paste writes through the editing lifecycle
  enableCellSelection: true,  // click / keyboard selection
  enableClipboard: true,      // copy + paste (implies enableCellSelection)
})
```

- **Select** — click a cell; **Shift-click** selects a rectangle.
- **Navigate** — **Arrow** moves; **Shift+Arrow** grows the range; **Tab** steps and wraps to the next
  row; **Home / End** to the row edges (**Ctrl/Cmd+Home / End** to grid corners); **Ctrl/Cmd+A** all.
- **Edit** — **Enter** / **F2** opens the editor on an editable cell; **Esc** clears.
- **Copy** — **Ctrl/Cmd+C** copies the selection as TSV (each value formatted by its cell type).
- **Paste** — **Ctrl/Cmd+V** writes TSV from the active cell across as many rows/columns as it spans;
  read-only cells are skipped, values parsed + validated. Paste requires `enableEditing`.

**Customize.**

- **Whole-column copy (H3)** — **Ctrl/Cmd+Space** (or `runtime.copyColumn(id)`) grabs **every row across
  all pages** (pre-pagination, in filter+sort order). Gate it with `enableCopyColumn` (default `true`).
- **Whole-row copy (H2)** — **Shift+Space** / `runtime.copyRow(id)`. Gate with `enableCopyRow` (default `true`).
- **Drive it programmatically** — via `useBstGrid` → `runtime.setActiveCell` / `moveActive` /
  `getSelectionMatrix` / `copySelection` / `pasteFromText`. `runtime.getSelectionStats()` returns
  `{ count, numericCount, sum, avg, min, max }` over the selection — the X5 **status bar**
  (`showStatusBar` in the adapters) renders it.
- **Right-click menu (X6)** — `enableContextMenu` opens a menu at the cursor with **Copy · Copy row ·
  Copy column** (while clipboard is on), **Export CSV / Excel** (while export is on) and **Autosize
  column**. Reshape it with **`getContextMenuItems(ctx) => BstContextMenuItem[]`** — spread
  `ctx.defaultItems` and add your own (each `{ label, onSelect, disabled?, separator?, icon? }`). Both
  adapters inherit it; if the resolved list is empty the native browser menu is left alone.
- **Shortcuts overlay** — `showShortcuts` (in the adapters) adds a **"?" button** + a dep-free overlay
  listing the shortcuts **active on this grid** (also opens on `?`). Headless: `<BstShortcuts table={table} />`
  + `BST_SHORTCUTS_REGISTRY` + the pure `resolveActiveShortcuts(flags, query)` / `formatShortcutToken`.

> Selection lives in the interaction store (not `table.setState`) and is materialised at paint from the
> active/anchor cell ids — moving the cursor re-renders only the cells whose state changed, never the
> whole grid.

## Find

**Use it.** `enableFind` adds an in-grid **find bar** that **highlights every match and jumps between
them** — the browser-`Ctrl+F` experience *inside* the grid. It is **distinct from global search**
(`enableGlobalFilter`), which hides non-matching rows: Find **hides nothing**, so you keep the
surrounding context while locating a value.

- **Open** with **⌘/Ctrl+F** (or the adapters' toolbar **⌕ Find** button, `showFind`). **Cycle** with
  **Enter / Shift+Enter** in the box or **F3 / Shift+F3**; **close** with **Esc**. A **"n / m"** counter
  shows the current position.
- **What matches** — the cell's *display* text (the same `formatValue` used by copy/export), so
  "what you find" equals "what you copy". Plain-text cells get in-place `<mark>` highlights; every
  matched cell (including non-text ones) gets a tint, and the current match is outlined and scrolled
  into view.
- **Configure** via the object form: `enableFind={{ caseSensitive: true, scope: 'all' }}` —
  `scope: 'view'` (default) searches the current page/window, `'all'` searches every filtered row.
- **Drive it programmatically** — `runtime.openFind()` / `closeFind()` / `setFindQuery(q)` /
  `findNext()` / `findPrev()`.

> Works independently of `enableCellSelection`. Match state lives in the interaction store and is
> painted per-cell, so typing / stepping re-renders only the matched cells, never the whole grid.

## Export (CSV / Excel / print)

**Use it.** `enableExport` adds a toolbar **Export** menu — download **CSV**, download **Excel**
(`.xlsx`) or **print** — and the programmatic API `runtime.exportCsv()` / `exportExcel()` /
`printTable()`. Values are formatted **per cell type** (so the file matches what the grid shows and
what copy produces), and the default scope is **every filtered + sorted row across all pages**
(pre-pagination), not just the visible page.

```tsx
const table = useBstTable<Row>({
  data, columns, getRowId: (r) => r.id,
  enableExport: { fileName: 'people' },   // or `enableExport: true`
})
```

**Customize.** Pass a `BstExportOptions` object (an object implies enabled, §12):

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `csv` / `excel` / `print` | `boolean` | `true` | Which formats the menu offers. Also settable at the top level as `enableCsvExport` / `enableExcelExport` / `enablePrint` — the settings-sheet switches, which win. |
| `fileName` | `string` | `'export'` | Base download name; the extension is added per format. |
| `scope` | `'all' \| 'page'` | `'all'` | Export every page (pre-pagination) or just the current page. |
| `includeHeaders` | `boolean` | `true` | Write the header row. |

- **Dependency-free.** CSV is RFC-4180 (quoted fields, UTF-8 BOM so Excel reads it). The `.xlsx` is a
  real OOXML package built here from a store-only ZIP + SpreadsheetML — **no `exceljs` / `sheetjs`**;
  `number` cells are written as typed numeric cells. Print opens a standalone, styled table view.
- **Per-call overrides.** Each `runtime.export*` accepts `{ scope?, fileName?, includeHeaders?, delimiter? }`
  (e.g. `runtime.exportCsv({ scope: 'page', delimiter: ';' })`).
- **Serializers are exported** for custom flows: `toCsv`, `toXlsx`, `buildPrintHtml`, plus
  `downloadBlob` / `printHtml` (both no-op under SSR).
- Adapters render the menu via `showExport` (default: follows `enableExport`); action columns and
  grouped/aggregate rows are skipped automatically.

## Access control

**Use it.** Interactivity resolves through one **grid → row → column → cell** cascade — the first
disable in the chain wins. A disabled cell greys out and can't be edited (it overrides
`meta.editable`), but stays selectable/copyable.

```tsx
useBstTable<Row>({
  data, columns, getRowId: (r) => r.id,
  enableEditing: true,
  disabled: readOnlyMode,                          // F1 — whole grid
  rowDisabled: (row) => row.status === 'locked',   // F2 — a row
  cellDisabled: ({ row, columnId }) =>             // F4 — any cell, cross-cutting
    columnId === 'salary' && !currentUser.canSeePay,
})

// F3 (whole column) / F4 (per-row) live on the column:
{ id: 'score', accessorKey: 'score',
  meta: { type: 'number', editable: true, disabled: (row) => row.final } }
```

**Customize.** Read the resolved state via `runtime.getCellAccess(rowId, columnId)` →
`{ disabled, editable }` (also `runtime.isCellDisabled` / `isRowDisabled`). A **runtime per-column edit
lock** — `runtime.setColumnEditable(columnId, on)` — overrides `meta.editable` live; adapters surface it
as a lock/unlock toggle in the Columns menu (`showColumnEditToggle`).

## Row selection

**Use it.** `enableRowSelection` adds a leading checkbox column — header "select all" (indeterminate on
a partial selection), per-row checkboxes, and a selected-row highlight. Built on v9's
`rowSelectionFeature`, so state lives in `table.state.rowSelection` keyed by `getRowId`.

```tsx
const table = useBstTable<Row>({ data, columns, getRowId: (r) => r.id, enableRowSelection: true })

const chosen = table.getSelectedRowModel().rows.map((r) => r.original)  // read it
table.resetRowSelection()                                              // clear it
```

**Customize.** The checkbox column sits outside the column model, so it never joins cell-selection
ranges, copy output, resizing or reordering. Adapters add a "{n} selected" chip + **Clear** to the
toolbar (`showSelectionInfo`, defaults to follow `enableRowSelection`).

## Undo and redo

**Use it.** `enableUndoRedo` snapshots `data` before every committed change (edits, paste, row
add/delete/duplicate), so it needs a controlled `onDataChange`.

```tsx
const { table, runtime } = useBstGrid<Row>({
  data, columns, getRowId: (r) => r.id, onDataChange: setRows,
  enableEditing: true,
  enableUndoRedo: true,
})
// keyboard: Ctrl/Cmd+Z undo · Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo — or drive it:
runtime.undo(); runtime.redo(); runtime.canUndo(); runtime.canRedo()
```

**Customize.** A fresh change clears the redo stack. Adapters render Undo/Redo buttons (`showUndoRedo`).

## Filtering

Three layers, all optional and composable:

- **Global search** (`enableGlobalFilter`, default on) — one box filters across columns. Adapters render it (`showSearch`).
- **Column filters** (`enableColumnFilters`, default on) — every column defaults to the operator-aware
  `bstCondition` filterFn, which reads a `{ op, value }` condition.
- **Filter builder / filter row** — neutral UIs over those conditions.

**Use it.**

```tsx
import { useBstTable, BstTable, BstFilterBuilder } from '@bloomskill/table-engine'

const table = useBstTable({ data, columns, getRowId: (r) => r.id })
return (
  <div className="bst-table-root">
    <BstFilterBuilder table={table} />  {/* adapters wrap this in a "Filters" panel */}
    <BstTable table={table} />
  </div>
)
```

**Customize.**

- **Operators are chosen by `meta.type`** — text (contains / equals / starts with / is empty…),
  number (`= ≠ > < between`), date (on / after / before / between), select (is / is not), boolean.
- **Per-column filter row** — `enableColumnFilterRow` renders a type-aware input under each header
  (the "dual filter"; coexists with the builder panel).
- **Set Filter (X4)** — `enableSetFilter` turns the filter-row control for categorical columns
  (`singleSelect` / `multiSelect` / `radio` / `boolean`) into an Excel-style **checklist of distinct
  values** (`BstSetFilter`: search · select-all / clear · per-value counts · a "(Blanks)" bucket).
  Force it on any column with `meta.filter: 'set'`, or off with `meta.filter: 'condition'`. It writes an
  `{ op: 'set' }` condition, so it composes with the builder and `bstCondition`. Needs
  `enableColumnFilters` **and** the filter row visible (`enableColumnFilterRow`).
- **Multi-filter (X11)** — `enableMultiFilter` lets a column **stack several filter types**. Set its
  `meta.filter` to an **array** (e.g. `['condition', 'set']`) and the filter row shows those filters
  stacked; a row must satisfy **all** of them (AND). Stored as a compound
  `{ op: 'and', conditions }` value the same `bstCondition` filterFn understands (helpers
  `combineFilterConditions` + type `FilterConditionGroup`). A `'set'` part also needs `enableSetFilter`;
  when `enableMultiFilter` is off, an array `meta.filter` falls back to its first entry.

  ```tsx
  { id: 'name', accessorKey: 'name', header: 'Name',
    meta: { type: 'text', filter: ['condition', 'set'] } } // "contains" input + distinct-values checklist
  ```
- **Compose your own** — the exported `evalCondition`, `operatorsForType`, and `*_OPERATORS` tables let
  you build custom filter UIs. Read active filters via `table.state.columnFilters`.

### Sorting

On by default (`enableSorting`). Set a column's `sortFn` to a built-in (`basic` · `alphanumeric` ·
`datetime`) or a custom function; multi-sort is supported (Shift-click headers in the adapters).

### Pagination

On by default (10/page). `pagination={{ pageSize: 25 }}` sets the size; `pagination={false}` shows all
rows. Adapters render the bar (`showPagination`) with `pageSizeOptions` (default `[5,10,20,50]`).

## Grouping and aggregation

**Use it.** `enableGrouping` groups rows into **collapsible group headers** with per-column aggregates.

```tsx
const columns: BstTableColumn<Sale>[] = [
  { id: 'region', accessorKey: 'region', header: 'Region' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount',
    aggregationFn: 'sum', meta: { type: 'number', cellMeta: { currency: 'USD' } } },
]

const table = useBstTable<Sale>({
  data, columns, getRowId: (r) => r.id,
  enableGrouping: true,
  initialState: { grouping: ['region'] },   // or table.setGrouping([...])
})
```

**Customize.** A column aggregates by declaring `aggregationFn`: `'sum' | 'count' | 'mean' | 'min' |
'max' | 'extent' | 'uniqueCount'`. Adapters add a group toggle (▤) in the columns menu. Built on v9's
`columnGroupingFeature` + `rowAggregationFeature`. *(Client mode — at 1M rows group server-side.)*

## Column layout

All the ways to arrange columns. Resize + hide are on by default; the rest are opt-in.

| Want | Turn on | Notes |
| --- | --- | --- |
| **Show / hide** | `enableHiding` *(on)* | Adapters render a columns menu (`showColumnsMenu`). |
| **Resize** | `enableColumnResizing` *(on)* | Drag the header edge (`table-layout: fixed`). |
| **Auto-size** | — | **Double-click** a resize handle to fit content (sampled `canvas.measureText`, clamped to `min/maxSize`). `computeAutoWidth` is exported. |
| **Pin (freeze)** | `enableColumnPinning` | Sticky start/end columns, kept fully opaque. |
| **Reorder** | `enableColumnOrdering` | Column-menu move **+** header drag-drop. |
| **Fit to viewport** | `fitColumns` | No horizontal scroll — data columns share the width; utility columns stay fixed; manual resize suppressed while on. |
| **Responsive hide** | `enableResponsive` | Hides lowest-`meta.responsivePriority` columns when narrow, restores as it widens (`ResizeObserver`). No-op under `fitColumns`. |

Adapters add a **density** toggle (`showDensityToggle` → `data-bst-density` → compact / comfortable rows).

## Row layout

| Want | Turn on | Notes |
| --- | --- | --- |
| **Master-detail** | `enableExpanding` + `renderDetail(row)` | Leading expander column; clicking opens a full-width detail panel. `getRowCanExpand(row)` gates which rows expand. |
| **Row pinning** | `enableRowPinning` | Leading pin column; the toggle cycles a row **top → bottom → unpinned**. Pinned rows survive sort/filter/pagination and stick while the body scrolls. |
| **Row resizing** | `enableRowResize` | Drag any row's **bottom edge** to set its height (min 24px; **double-click** resets). Heights are local UI state. |
| **Auto row height** | `enableAutoRowHeight` | Body cells **wrap** and each row grows to fit its content — **browser-measured, no JS**. Opt a single column in with `meta.wrapText`. A manually-resized row keeps its set height and clips the wrapped content (X26). |
| **Sticky-header viewport** | `enableStickyHeader` | Caps the scroll box to a bounded height so rows scroll under a **sticky header + filter row** instead of the table growing taller as the page size grows (G3/G4). `true` → 440px; `{ maxHeight: 500 }` / `{ maxHeight: '60vh' }` / `{ maxRows: 10 }` to size it. Already included in `enableVirtualization`, so the standalone class is skipped when windowing is on. Height overridable via `styles.root` / the `--bst-max-height` var. |

```tsx
useBstTable<Order>({
  data, columns, getRowId: (r) => r.id,
  enableExpanding: true,
  getRowCanExpand: (row) => row.lineItems.length > 0,
  renderDetail: (row) => <OrderLines items={row.lineItems} />,
})
```

## Row numbers, auto-columns & overlays

Three zero-config conveniences, each a §12 toggle (all appear in the runtime settings sheet):

**Row numbers (X9)** — `enableRowNumbers` prepends a leading, non-interactive `#` column that
numbers the **current view**: numbering is continuous across pages and follows the active sort +
filter (not the raw data order). It never sorts, filters, hides, resizes or reorders, so it stays out
of the columns menu, filter row and export. It is **pinned to the start (sticky-left) by default**, so
it stays the leftmost column even when you pin another column, and stays visible during horizontal
scroll. Override the header with `rowNumberHeader`.

**Auto-generate columns (X27)** — `enableAutoColumns` infers columns from the data **when you pass
no `columns`** (an empty array): one column per key found across a sample of rows, with the cell type
guessed (number / boolean / date, else text) and a humanized header (`unitPrice` → "Unit Price").
Explicit columns always win. The pure helper is exported too:

```tsx
import { autoGenerateColumns } from '@bloomskill/table-engine'
const columns = autoGenerateColumns(rows, { exclude: ['id'], sampleRows: 100 })
// or just: useBstTable({ data, columns: [], enableAutoColumns: true, getRowId })
```

**Loading / error overlays (X23)** — `enableOverlays` (on by default) paints an overlay over the
grid while `loading` is true or when `error` is set (error wins). Wire it to a server source and it
works for free — `useBstDataSource` / `useBstInfiniteDataSource` expose `loading` + `error` on their
`tableProps`:

```tsx
const { tableProps } = useBstDataSource(source)   // carries loading + error
return <BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} {...tableProps} />
// customize: overlayText={{ loading: 'Fetching…' }} / renderErrorOverlay={(e) => <MyError e={e} />}
```

## Conditional formatting

> ▶ **[Run it live](https://gitofkumarsathish.github.io/bst-grid/docs/features/display/enableConditionalFormatting)** — editable demo, no install.

**Use it.** `conditionalFormats` is a declarative array of rules that colour cells/rows by value (K3),
or blank a cell (F5). Presence is the opt-in; `enableConditionalFormatting` (default on) is the runtime
off-switch.

```tsx
const table = useBstTable<Row>({
  data, columns, getRowId: (r) => r.id,
  conditionalFormats: [
    // colour the amount cell red when it's negative
    { scope: 'cell', columnId: 'amount', when: { op: 'lt', value: 0 },
      className: 'text-rose-600', style: { fontWeight: 600 } },
    // tint the whole row when status = overdue
    { scope: 'row', columnId: 'status', when: { op: 'equals', value: 'overdue' },
      style: { background: '#fff1f2' } },
  ],
})
```

**Customize.** Rules reuse the [filter operators](#filtering); `scope: 'cell' | 'row'`; `hideContent`
blanks a cell (F5). They **compose with** the `classNames`/`styles` slots and `meta.cellStyle`. Build
them at runtime with `<BstConditionalFormatBuilder>` (adapters host it behind a "Formats" button,
`showFormatBuilder`).

## Cell spanning

> ▶ **[Run it live](https://gitofkumarsathish.github.io/bst-grid/docs/features/display/enableCellSpanning)** — editable demo, no install.

**Use it.** `enableCellSpanning` merges body cells across **columns and rows**.

```tsx
useBstTable<Row>({
  data, columns, getRowId: (r) => r.id,
  enableCellSpanning: true,
  // one banner cell spans 3 columns:
  getCellSpan: ({ row, colIndex }) =>
    row.kind === 'banner' && colIndex === 0 ? { colSpan: 3 } : undefined,
})
// columns: [{ id: 'region', meta: { type: 'text', rowSpan: 'group' } }, …]  // auto row-merge
```

**Customize.**

- **Auto row-merge** — `meta.rowSpan: 'group'` merges vertically-consecutive equal values in a column.
- **Explicit** — `getCellSpan(ctx)` returns `{ colSpan?, rowSpan? }` for the **top-left origin**; covered
  cells leave the DOM; spans clamp to the grid bounds.
- It's render-only (no v9 dependency), so it composes with sort/filter/paginate. Because covered cells
  leave the DOM, prefer spanning for **display** grids (or keep spanned columns out of cell editing). The
  planner `computeCellSpans` is exported.

## Custom CSS

**Use it.** Style the grid with **your own** classes/styles via slot objects. Each slot **composes with**
the built-in `bst-*` class (never replaces it), so a theme keeps working underneath.

```tsx
const table = useBstTable<Row>({
  data, columns, getRowId: (r) => r.id,
  classNames: {
    root: 'ring-1 ring-slate-200 rounded-xl',
    headerCell: 'uppercase tracking-wide',
    row: ({ row }) => (row.status === 'overdue' ? 'bg-rose-50' : undefined), // conditional (K2)
    cell: ({ columnId }) => `col-${columnId}`,
  },
  styles: {
    row: ({ index }) => ({ '--stripe': index % 2 ? '#fafafa' : '#fff' } as React.CSSProperties),
  },
})
```

**Slots.**

| Slot | Element | Function form? |
| --- | --- | --- |
| `root` | outer scroll wrapper | — |
| `table` / `header` / `headerRow` / `body` | structural | — |
| `headerCell` | `<th>` | `(ctx: { columnId }) => …` |
| `filterRow` | per-column filter `<tr>` | — |
| `row` | body `<tr>` | `(ctx: { row, rowId, index }) => …` |
| `cell` | body `<td>` | `(ctx: CellRenderProps) => …` |
| `empty` | the "No rows" `<td>` | — |

**Customize.** Per-column CSS lives on the column: `meta.cellClassName` / `meta.cellStyle` (body cells,
K1) and `meta.headerClassName` / `meta.headerStyle` (that column's `<th>`) — the per-column values win
over the global `styles.cell` / `styles.headerCell`. The theme itself is CSS variables (`--bst-table-*`)
— override them on `.bst-table-root`. Adapters expose `className` / `style` for the outer card.

## Body icons

**Use it.** The grid body renders **inline-SVG icons** (skin-neutral, never emoji) for the sort
indicator, the expander, the row-pin control, the boolean cell, file-type icons, builder remove
buttons and the KPI trend chip. Override any slot via the `icons` prop:

```tsx
<BstTable table={table} icons={{ pin: MyPinIcon, booleanTrue: MyCheckIcon }} />
```

**Customize.** An icon is any `React.ComponentType<{ size?: number | string; className?: string }>`;
unspecified slots keep the built-in SVG. Slots: `sortAsc` · `sortDesc` · `sortNone` · `expandExpanded` ·
`expandCollapsed` · `pin` · `booleanTrue` · `remove` · `trendUp` · `trendDown` · `fileGeneric` ·
`filePdf` · `fileDoc` · `fileSheet` · `fileSlides` · `fileArchive` · `fileAudio` · `fileVideo`. The MUI /
shadcn adapters **forward their own icon set** automatically, so the whole grid uses one library.
`<BstFilterBuilder>` / `<BstConditionalFormatBuilder>` take the same prop.

## Runtime settings sheet

> 📖 Full guide: [`docs/settings-sheet.md`](../../docs/settings-sheet.md).

**Use it.** `useBstSettings` is a headless hook that lets **end-users** turn a grid's features on/off at
runtime (no code change), **per table**, persisted to `localStorage`. Adapters render it as a gear →
drawer/sheet (`showSettings`); here's the raw model:

```tsx
import { useBstSettings } from '@bloomskill/table-engine'

const { props: effective, model } = useBstSettings(props, { persistKey: 'people' })
const table = useBstTable(effective)   // enable*/show* now reflect the user's choices
// render model.groups → switches, each item: { key, label, group, value, set, toggle, reset }
```

**Customize.**

- **Which toggles appear** — every instance-level boolean toggle, grouped: **Data operations · Columns ·
  Rows · Editing · Selection & clipboard · Display**. Default-on data features always show; most opt-in
  features appear only once you've provisioned them (so a user can't switch on something the grid isn't
  wired for) — but a few end-user escape hatches stay **always shown** even unprovisioned: row grouping,
  copy column/row, the per-column filter row, **row resize**, and row/column virtualization. Pass
  `features: BstSettingKey[]` to curate the list.
- **Search** — the sheet lists 30+ toggles, so adapters render a **search box** (highlighted header +
  a filter input) that narrows the list by label / hint / group name. On by default, it appears only
  once the sheet has more than a handful of items; `search: false` hides it, `search: true` always shows
  it. The matching is the pure helper `filterSettingsGroups(model.groups, query)` — both adapters share it.
- **Dependencies** — sub-features whose prerequisite is off render **disabled** (dimmed, "Needs
  \<parent\>"): e.g. CSV/Excel/Print follow **Export**, Copy column/row follow **Copy & paste**, the
  per-column filter row + Set filter follow **Column filters**. The cascade is **transitive** and
  reverses when the parent is switched back on. Declared as `requires` edges on the registry (mirrors
  `packages/mcp/src/rules.ts`); the resolver is the pure export `isSettingActive(key, props)`. Where a
  parent and its dependents share a section, the sheet draws a **dotted branch connector** (git-graph
  style) from parent to child — `parentKey` / `lastChild` on each item carry the tree. Sections are
  separated by a divider with prominent uppercase headings.
- **Persistence** — on by default under a key derived from your columns; set `persistKey` to disambiguate,
  or `persist: false` for in-memory only.
- Exports: `applySettingsOverrides(props, overrides)`, `filterSettingsGroups` / `shouldShowSettingsSearch`
  (the search helpers), and `BST_SETTINGS_REGISTRY` (ordered metadata). The list is derived from the
  engine's own toggle interface, so new features show up automatically.

## Grid state — save / restore views (X21)

Persist a grid's **view** — sort · filter · global filter · column order/size/visibility/pinning ·
grouping · expansion · row pinning · selection · pagination — so a **per-user view** survives reloads.
This is distinct from the settings sheet above (which toggles *features*); grid state captures how the
data is currently *arranged*.

The snapshot (`BstGridState`) is plain, version-stamped JSON — safe to store per user or send to a
server. `applyGridState` **drops entries for columns that no longer exist**, so a saved view survives a
column-set change instead of wedging the grid.

```tsx
import { useBstTable, loadGridState, useBstGridState } from '@bloomskill/table-engine'

function Grid() {
  // 1) restore on mount (flash-free) by seeding initialState from storage
  const table = useBstTable({ data, columns, initialState: loadGridState('orders') })
  // 2) persist changes back (debounced)
  const view = useBstGridState(table, { key: 'orders' })
  return (
    <>
      <button onClick={view.reset}>Reset view</button>
      <BstTable table={table} />
    </>
  )
}
```

**Adapters** wrap both steps in one prop — `gridState={{ key: 'orders' }}` on `<BstTableMui>` /
`<BstTableShadcn>` seeds `initialState` from storage and persists changes for you. Pass
`persist: false` (with `showSettings` on) for **manual save**: the settings-sheet footer gains a
**Save view** button (plus **Reset view**), so the user persists the arrangement on click rather
than on every change — the adapters call `saveGridState` / `resetGridState` + `clearGridState` for you.

> **Two stores, not one.** Grid state (this API, `bst-table:state:<key>`) holds the **view** — sort ·
> filters · column layout · grouping. The settings sheet (`showSettings`,
> `bst-table:settings:<key>`) holds which **features** are on, and saves **automatically** on every
> change. They are independent: **Save view** does not capture feature toggles, and each has its own
> Reset. The adapters label both halves in the sheet so the difference is visible to end-users.
> Both are **per browser** — swap `gridState.storage` (any `BstGridStateStorage`) or drive
> `getGridState` / `initialState` yourself to put the view behind a user account instead.

| Export | Kind | Purpose |
| --- | --- | --- |
| `getGridState(table, select?)` | fn | Snapshot the current view as `BstGridState`. |
| `applyGridState(table, state, select?)` | fn | Restore a (partial) snapshot; ignores stale column ids. |
| `resetGridState(table, select?)` | fn | Clear the view (sort/filter/layout/grouping) to defaults. |
| `loadGridState(key, storage?)` | fn | Read a persisted snapshot (→ feed `initialState`). |
| `saveGridState(key, state, storage?)` | fn | Write a snapshot to storage. |
| `clearGridState(key, storage?)` | fn | Remove a persisted snapshot. |
| `useBstGridState(table, opts)` | hook | Auto-persist on change; returns `{ getState, applyState, save, clear, reset, storageKey }`. |

`select` = `{ include?, exclude? }` (a subset of `BstGridStateKey`); hook `opts` =
`{ key, storage?, persist?, debounceMs?, include?, exclude? }`. Snapshots are namespaced under
`bst-table:state:<key>` in `localStorage` by default (pass any `storage` — e.g. `sessionStorage`).

## Virtualization (D1)

> **Available since 0.33.0** — row/column windowing on `@tanstack/react-virtual` (see [`COVERAGE.md`](../../COVERAGE.md)).

Render only the rows (and, optionally, columns) inside the scroll viewport, so a 10k–1M-row dataset
stays smooth with a bounded DOM. Opt-in and **off by default** — a normal grid keeps its whole row
model in the DOM.

```tsx
<BstTableMui data={rows} columns={columns} getRowId={(r) => r.id} enableVirtualization />

// tuning (an object implies enabled):
<BstTableMui
  data={rows}
  columns={columns}
  getRowId={(r) => r.id}
  enableVirtualization={{ overscan: 12, estimateRowSize: 40 }}
  enableColumnVirtualization   // also window very wide grids horizontally
/>
```

| Option | Type | Default | What it does |
| --- | --- | --- | --- |
| `enableVirtualization` | `boolean \| VirtualizationOptions` | `false` | Window the **rows**. An object implies enabled and tunes the virtualizer. |
| ↳ `overscan` | `number` | `8` | Rows rendered beyond each viewport edge (smoother scroll, more DOM). |
| ↳ `estimateRowSize` | `number` | `36` | Estimated row height (px) before a row is measured — keep close to the real height. |
| ↳ `estimateColumnSize` | `number` | `150` | Estimated column width (px) for column virtualization. |
| `enableColumnVirtualization` | `boolean` | `false` | Also window **columns** (very wide grids). **Needs `enableVirtualization`.** |
| `onReachEnd` | `() => void` | — | **A2 infinite scroll** — fired once when the virtualized body nears its end (fetch the next page here). |
| `endReachedThreshold` | `number` | `8` | Rows-from-end that trigger `onReachEnd`. |

**Requirements & behaviour**

- The scroll box needs a **bounded height** — one is applied by default; override via `styles.root`.
- **Yields gracefully.** Some features need rows outside the window (multi-`<tr>` items, spans, pins),
  so when any of **master-detail (`enableExpanding`) · grouping · cell spanning · row pinning** is on,
  the grid renders **un-windowed** and logs a one-time dev warning (the incompatible feature wins;
  these target small, curated datasets anyway). The active reason comes from `virtualizationBypassReason`.
- Column virtualization additionally falls back to all-columns under **column pinning**, `fitColumns`,
  grouped headers or cell spanning.
- `resolveVirtualization` and `virtualizationBypassReason` are exported (pure, unit-tested) if you need
  the resolved config or the bypass reason yourself.

## Server mode (DataSource)

> ▶ **[See the server-mode recipe](https://gitofkumarsathish.github.io/bst-grid/docs/recipes)** — or clone [`examples/server-mode`](../../examples/server-mode) (5k rows, runs offline via `createClientDataSource`).

**Use it.** By default the grid sorts/filters/paginates the full `data` array in memory. For large
datasets (10k–1M rows) let the server do it: wrap your fetch in a `DataSource` and drive it with
`useBstDataSource`. The grid goes into TanStack **manual mode** and its existing chrome drives the query.

```tsx
import { useBstDataSource, createServerDataSource } from '@bloomskill/table-engine'

const source = createServerDataSource(async (query, signal) => {
  // query: { sort, filters, quickFilter?, offset, limit }
  const res = await fetch('/api/people?' + toParams(query), { signal })
  const { rows, total } = await res.json()
  return { rows, totalCount: total }   // totalCount drives the page count
})

function People() {
  const ds = useBstDataSource(source, { pageSize: 25 })
  return (
    <>
      {ds.loading && <Spinner />}
      {ds.error && <ErrorBanner error={ds.error} />}
      <BstTableShadcn columns={columns} getRowId={(r) => r.id} {...ds.tableProps} />
    </>
  )
}
```

**Customize.**

- **`useBstDataSource`** manages the request lifecycle — **aborts** superseded requests, ignores **stale**
  responses, **debounces** filter/search typing (sort + paging are immediate), **resets to page 0** when
  the result set changes. Returns `{ rows, totalCount, loading, error, refetch, tableProps }`.
- **`tableProps`** = `manual*` flags + `rowCount` + controlled `state` + `on*Change` — spread it into
  `useBstTable` / any adapter. No adapter changes needed.
- **`createClientDataSource(rows)`** is an in-memory source with the same operator semantics — build
  against it and swap in the real server by changing one line.
- Keep `source` **stable** (module scope / `useMemo`); pass a changed `sourceKey` to refetch immediately.
- **Caveats:** **grouping** and **whole-column copy** operate on the *loaded page* under a DataSource;
  `sort` / `filter` ids are **column ids** — map them to DB fields in the fetcher.

**Infinite scroll (A2).** For a growing, virtualized list instead of pages, swap `useBstDataSource`
for **`useBstInfiniteDataSource`** — it **appends** windows as you scroll rather than replacing the
page. Pair it with `enableVirtualization` and `pagination={false}`, and wire `onReachEnd`:

```tsx
import { useBstInfiniteDataSource } from '@bloomskill/table-engine'

function People() {
  const inf = useBstInfiniteDataSource(source, { pageSize: 100 })
  return (
    <BstTableShadcn
      columns={columns}
      getRowId={(r) => r.id}
      enableVirtualization
      pagination={false}
      showPagination={false}
      onReachEnd={inf.fetchNextPage}   // fires as the tail nears
      {...inf.tableProps}
    />
  )
}
```

Returns `{ rows, totalCount, loading, isFetchingNextPage, hasNextPage, fetchNextPage, onReachEnd,
refetch, tableProps }`. Sort / filter still run server-side and **reset** the accumulation to the
first window.

**File verbs (I3).** The `DataSource` contract has three optional file verbs so file storage can move
server-side (Plan.md §2.2): **`uploadFile(file, ctx?)`** → returns a stored `BstFileRef`,
**`deleteFile(ref, ctx?)`**, and **`getFileUrl(ref, ctx?)`** → a fresh short-lived view URL (so B5
thumbnails never bake a permanent URL into row data). Bridge them to a `files` cell's editor with
**`createFileHandlers(source, ctx?)`** — it returns the `onUpload` / `onDelete` the cell already uses:

```tsx
import { createFileHandlers } from '@bloomskill/table-engine'

const source = createServerDataSource(fetchPage) // also implements uploadFile/deleteFile/getFileUrl
const columns = [
  { id: 'docs', accessorKey: 'docs', header: 'Docs',
    meta: { type: 'files', editable: true, cellMeta: createFileHandlers(source) } },
]
```

A source that implements neither verb yields no handlers, so the cell keeps its local object-URL
preview fallback. New exports: `createFileHandlers`, types `BstFileRef`, `DataSourceFileContext`,
`BstFileCellHandlers`.

---

## Exports

<details>
<summary><b>Full export list</b></summary>

**Hooks / render** — `useBstTable` · `useBstGrid` · `getBstRuntime` · `BST_RUNTIME` · `BstTable` ·
`BstFilterBuilder` · `BstConditionalFormatBuilder` + types `BstTableInstance`, `BstRuntimeHandle`,
`BstFormatBuilderColumn`.

**Server mode (DataSource)** — `useBstDataSource` · `useBstInfiniteDataSource` · `createClientDataSource` · `createServerDataSource` · `createFileHandlers`
\+ types `DataSource`, `DataSourceQuery`, `DataSourcePage`, `DataSourceSort`, `DataSourceFilter`,
`BstFileRef`, `DataSourceFileContext`, `BstFileCellHandlers`,
`BstServerTableProps`, `BstDataSourceResult`, `UseBstDataSourceOptions`,
`BstInfiniteDataSourceResult`, `UseBstInfiniteDataSourceOptions`, `BstInfiniteTableProps`,
`DsSort`, `DsColumnFilter`,
`DsPagination`.

**Body icons** — `defaultBstIcons` · `resolveBstIcons` · `useBstIcons` · `BstIconsContext` ·
`BST_ICON_SLOTS` + types `BstIcons`, `BstIconOverrides`, `IconProps`, `IconComponent`.

**Settings** — `useBstSettings` · `applySettingsOverrides` · `BST_SETTINGS_REGISTRY` + types
`BstSettingKey`, `BstSettingsItem`, `BstSettingsGroup`, `BstSettingsModel`, `BstSettingsOptions`,
`BstSettingsOverrides`.

**Grid state (X21)** — `getGridState` · `applyGridState` · `resetGridState` · `emptyGridState` ·
`loadGridState` · `saveGridState` · `clearGridState` · `useBstGridState` · `BST_GRID_STATE_KEYS` ·
`BST_GRID_STATE_VERSION` + types `BstGridState`, `BstGridStateKey`, `BstGridStateSelect`,
`BstGridStateOptions`, `BstGridStateController`, `BstGridStateStorage`.

**PDF thumbnails (B5)** — `BstPdfThumbnailerProvider` · `useBstPdfThumbnailer` · `createPdfjsThumbnailer`
+ types `PdfThumbnailRenderer`, `PdfThumbnailerOptions`. Needs `pdfjs-dist` (yours to install).

**Filtering (E3 / X11)** — `evalCondition` · `isConditionActive` · `combineFilterConditions` ·
`operatorsForType` · `operatorArity` · `filterFn_bstCondition` · `TEXT_OPERATORS` / `NUMBER_OPERATORS` /
`DATE_OPERATORS` / `SELECT_OPERATORS` / `BOOLEAN_OPERATORS` + types `FilterOperator`, `FilterCondition`,
`FilterConditionGroup`.

**Conditional formatting (K3)** — `evalCellFormat` · `evalRowFormat` · `DEFAULT_FORMAT_PRESETS` + types
`BstFormatRule`, `BstFormatScope`, `BstFormatContext`, `FormatResult`, `BstFormatPreset`.

**Cell-type registry** — `createCellTypeRegistry` · `defineCellType` · `createDefaultRegistry` ·
`defaultCellTypes` · `advancedCellTypes` + all 17 cell types: `textCellType` · `longTextCellType` ·
`numberCellType` · `dateTimeCellType` · `booleanCellType` · `singleSelectCellType` ·
`multiSelectCellType` · `radioCellType` · `hyperlinkCellType` · `filesCellType` ·
`sparklineCellType` · `kpiCellType` · `actionCellType` · `actionMenuCellType` · `qrCellType` ·
`barcodeCellType` · `richTextCellType` + type `CellTypeRegistry`.

**Advanced-cell encoders** — `qrMatrix` · `code128` · `sanitizeHtml` · `htmlToText` · `escapeHtml` ·
`isRichTextEmpty` · `RichTextEditor` + types `QrMatrix`, `QrEcLevel`, `BarcodeResult`.

**Spanning / auto-size** — `computeCellSpans` · `computeAutoWidth` · `measureTextWidth` + types
`BstCellSpan`, `BstSpanContext`, `SpanPlan`, `SpanRow`, `SpanCol`, `AutoSizeOptions`.

**Runtime / store** — `createRuntime` · `createInteractionStore` · `createStore` · `useStoreSelector` ·
`arrayEqual` · `cellKey` · `splitCellKey` · `runValidators` · `hasBlockingError` + types `BstRuntime`,
`RuntimeCtx`, `CellChange`, `BstCellEdit`, `BstRowChange`, `BstSaveEvent`, `BstSaveResult`, `CellAccess`, `CellRef`,
`SaveTrigger`, `CommitPolicy`, `VisualIndex`, `MoveActiveOptions`, `InteractionState`,
`InteractionStore`, `Store`.

**Core** — `bstTableFeatures` · `createColumnHelper` · `flexRender` + types `BstTableColumn`,
`UseBstTableOptions`, `BstTableEngineToggles`, `BstTableFeatures`, `EditingOptions`,
`ValidationOptions`, `BstClassNames`, `BstStyles`, `BstRowContext`, `BstHeaderSlotContext`,
`CellType`, `CellRenderProps`, `CellEditProps`, `CellValidateContext`, `BstColumnMeta`, `BstOption`,
`BstCellApi`, `FieldError`, `FieldErrorLevel`.

</details>

## Requirements

- **Peers:** `react` / `react-dom` `>= 18`
- **Bundled** (installed automatically): `@tanstack/react-table` `^9`, `@tanstack/react-virtual` `^3`

## License

MIT
