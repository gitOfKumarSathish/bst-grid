# Runtime settings sheet · row action menu · copy toggles

A reference for the end-user customization features added to Bst-Table: the **settings
sheet** (per-table feature toggles, no code), the **row action overflow ("⋯") menu**, and the
**copy-column / copy-row** sub-toggles. All three are opt-in and ship in every skin.

- Engine: [`@bloomskill/table-engine`](../packages/engine/README.md) — the headless model + cell type + toggles.
- Adapters: [`@bloomskill/table-mui`](../packages/mui/README.md) · [`@bloomskill/table-shadcn`](../packages/shadcn/README.md) — render the sheet as a Drawer / slide-over.
- Toggle registry & conventions: `CLAUDE.md` §12. Release notes: `CHANGELOG.md`.

---

## 1. Settings sheet (`showSettings`)

A **gear icon** in the toolbar opens a **side sheet** where the end-user flips a grid's features
on/off **at runtime**, **per table**, persisted to `localStorage`. It's the code-free way to
customize a grid — turn copy off, hide pagination, enable grouping, etc.

```tsx
// MUI — right-side Drawer; shadcn — dependency-free slide-over. Same API.
<BstTableMui data={rows} columns={cols} getRowId={(r) => r.id} showSettings />
<BstTableShadcn data={rows} columns={cols} getRowId={(r) => r.id} showSettings />
```

### `showSettings`

`showSettings?: boolean | BstSettingsOptions` (default `false`, opt-in).

```ts
interface BstSettingsOptions {
  /** Restrict the sheet to these keys (registry order). Omit → auto. */
  features?: BstSettingKey[]
  /** Sheet heading. Default "Table settings". */
  title?: string
  /** localStorage key. Omit → derived from the column ids. Set it to disambiguate
   *  two grids with identical columns. */
  persistKey?: string
  /** Persist choices to localStorage. Default true. */
  persist?: boolean
}
```

- **Per table** — state is local to each grid instance, saved under
  `bst-table:settings:<persistKey | derived-from-columns>`.
- **Which toggles appear:** default-on data features + any opt-in feature the developer has
  provisioned + the *always-visible* opt-ins below. A user can turn a provisioned feature off/on,
  but can't switch on something the grid isn't wired for — with five deliberate exceptions
  (**Row grouping**, **Copy column**, **Copy row**, **Per-column filter row**, **Conditional
  formatting**) that are always shown so they're always customizable. Use `features` to curate
  the list explicitly.

### The toggle list (grouped)

| Group | Toggles |
| --- | --- |
| **Data operations** | Sorting · Global search · Column filters · Pagination · **Row grouping** |
| **Columns** | Resize columns · Show / hide columns · Pin columns · Reorder columns · **Per-column filter row** · Fit columns to width · Responsive columns |
| **Rows** | Master-detail rows · Pin rows · Resize rows |
| **Editing** | Inline editing · Validation · Add / delete rows · Undo / redo |
| **Selection & clipboard** | Row selection · Cell selection · Copy & paste · **Copy column** · **Copy row** |
| **Display** | Cell spanning · **Conditional formatting** · Filter builder · **Format builder** · Density toggle |

Default-on data/display features always show; opt-in features show once provisioned, except the
**bold** ones which always show. Conditional formatting (default **on**) only has a visible effect
on grids with `conditionalFormats` rules — switching it off makes the rules inert without
dropping them. Format builder shows the adapters' toolbar **"Formats"** button, which opens the
rule-builder panel — so end-users can create rules at runtime even on grids that shipped none.

### Headless hook — `useBstSettings`

The sheet is pure/headless so both skins share one model; each renders it in its own idiom.

```tsx
const { props: effective, model } = useBstSettings(props, { persistKey: 'people' })
const table = useBstTable(effective)   // enable*/show* now reflect the user's choices
// model = { items, groups, overrideCount, reset, storageKey }
// item  = { key, label, group, layer, hint?, value, overridden, set, toggle, reset }
```

Also exported: `applySettingsOverrides(props, overrides)` (pure merge) and `BST_SETTINGS_REGISTRY`
(ordered metadata).

### Stays in sync automatically (compile-enforced)

`BstSettingKey` is **derived from `BstTableEngineToggles`**, and the metadata map is typed
`Record<BstSettingKey, …>`. **Adding a new engine toggle fails the build until it's registered in
the sheet** — a one-line entry (`enableFoo: { group, default }`; label humanized, layer inferred).
So the settings sheet can never silently fall behind the engine. See `CLAUDE.md` §12
"settings-sheet parity". A toggle that lives on `UseBstTableOptions` rather than
`BstTableEngineToggles` is registered via `ExtraEngineSettingKey` in `packages/engine/src/settings.ts`.

---

## 2. Row action overflow menu — `meta.type: 'actionMenu'`

A compact **"⋯" (three-dots / kebab)** button that opens a popup of the row's actions — the
space-saving alternative to the inline `action` buttons.

```tsx
// inline buttons:
{ id: 'actions', meta: { type: 'action',     actions: { edit: true, delete: true, duplicate: true } } }
// ⋯ overflow menu:
{ id: 'actions', meta: { type: 'actionMenu', actions: { edit: true, delete: true, duplicate: true } } }
```

- **Same actions** via the same cell `api` + `meta.actions`: Edit → Save / Cancel while editing,
  Duplicate, Delete.
- **Dependency-free** — a `position: fixed` popup (so the table's scroll never clips it) that
  closes on outside-click / **Escape** / scroll. Styled with `--bst-table-*`, so it themes in both
  skins (light & dark).
- Both adapters inherit it (shadcn via `...defaultCellTypes`, MUI via its preset). It's a cell type
  (`meta.type`), not a toggle, so it's not part of the settings sheet.

---

## 3. Copy-column / copy-row toggles

Copy-column (H3) and copy-row (H2) are part of the **clipboard** feature but are now **individually
toggleable**, and appear in the settings sheet under **Selection & clipboard**.

| Toggle | Default | Gates | Setting |
| --- | --- | --- | --- |
| `enableClipboard` | `false` | copy/paste selection (Ctrl/⌘+C/V) + implies the two below | Copy & paste |
| `enableCopyColumn` | `true` | Ctrl/⌘+Space column-copy **and** the Columns-menu "Copy column" button | Copy column |
| `enableCopyRow` | `true` | Shift+Space row-copy / `runtime.copyRow` | Copy row |

```tsx
// clipboard on, but column-copy off:
<BstTableMui data={rows} columns={cols} getRowId={(r) => r.id}
  enableClipboard enableCopyColumn={false} showSettings />
```

Gating happens once, in the engine runtime (`selectColumn` / `copyColumn` / `selectRow` /
`copyRow`), so the **keyboard gestures** always respect the toggle with no adapter wiring. In
addition, both adapters **hide the Columns-menu "Copy column" button** when `enableCopyColumn` is
off (`copyColumnOn = enableClipboard && enableCopyColumn !== false`), so a disabled feature leaves
no dead control. Defaults preserve today's behavior (both on when clipboard is on).

---

## 4. Status

- **Tests:** `settings.test.tsx` (model + persistence + parity guard), `actionMenu.test.tsx`,
  `copyToggles.test.tsx`, plus the MUI/shadcn settings-sheet tests. Full suite green.
- **Verification:** engine + both adapters typecheck clean; the compile guard is proven (a new
  engine toggle breaks `settings.ts` until registered).
- **Docs:** this file · `CLAUDE.md` §12 registry · package READMEs · `CHANGELOG.md`.
