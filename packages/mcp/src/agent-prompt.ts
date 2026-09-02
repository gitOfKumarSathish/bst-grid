import type { BstCorpus, FeatureEntry } from './types.js'

/**
 * The **agent prompt** — one self-contained briefing you paste at the top of a
 * chat so a coding agent writes real Bst-Table code.
 *
 * Why it exists: no language model was trained on this library. Asked for "a
 * Bst-Table grid with batch editing" cold, a model reaches for whichever grid it
 * *does* know and emits confident, non-existent props. The MCP server
 * (`@bloomskill/table-mcp`) is the durable fix — but it needs a client that
 * speaks MCP. This is the zero-setup fallback: copyable into any chat box.
 *
 * It is **generated from the corpus**, so the version, the flag list, the cell
 * types and the coverage gaps are the real ones for the release it ships with —
 * the same guarantee the docs site and the MCP tools give. Hand-writing it would
 * put a third stale copy of the API surface in the tree.
 *
 * Rendered to: the `bst://prompt` MCP resource · `npx @bloomskill/table-mcp
 * prompt` · `apps/docs/static/prompt.txt` (the docs site's copy button).
 */

/** Where the published docs live, for the "Looking things up" footer. */
const SITE = 'https://gitofkumarsathish.github.io/bst-grid'

/** Settings-sheet groups, in the order the sheet renders them. */
const GROUP_ORDER = [
  'Data operations',
  'Columns',
  'Rows',
  'Editing',
  'Selection & clipboard',
  'Display',
  'Performance',
  'Export',
]

export interface AgentPromptOptions {
  /** Docs site base URL (no trailing slash). Defaults to the published site. */
  site?: string
}

/**
 * One toggle per flag name. A few §12 rows document a *mode* of an existing flag
 * (`enableEditing: { mode: 'batch' }`) and reduce to a duplicate `enableEditing`
 * entry; the first row is the canonical one — the same rule `dump-corpus.mjs`
 * applies before generating the docs pages.
 */
function toggles(corpus: BstCorpus): FeatureEntry[] {
  const seen = new Set<string>()
  return corpus.features.filter((f) => {
    if (f.kind !== 'toggle' || !f.flag || seen.has(f.flag)) return false
    seen.add(f.flag)
    return true
  })
}

/** `enableSorting*` — the star marks a flag that is already on by default. */
const withDefaultMark = (f: FeatureEntry): string =>
  `${f.flag}${f.default === 'true' ? '*' : ''}`

/** Engine toggles as `Group — flagA, flagB` lines, in settings-sheet order. */
function engineFlagLines(list: FeatureEntry[]): string[] {
  const byGroup = new Map<string, string[]>()
  for (const f of list.filter((f) => f.layer === 'engine')) {
    const group = f.group ?? 'Other'
    byGroup.set(group, [...(byGroup.get(group) ?? []), withDefaultMark(f)])
  }
  const groups = [...byGroup.keys()].sort(
    (a, b) =>
      (GROUP_ORDER.indexOf(a) + 1 || Infinity) - (GROUP_ORDER.indexOf(b) + 1 || Infinity) ||
      a.localeCompare(b),
  )
  return groups.map((g) => `- **${g}** — ${byGroup.get(g)!.join(', ')}`)
}

/** Builds the paste-anywhere agent prompt for this corpus. */
export function buildAgentPrompt(corpus: BstCorpus, options: AgentPromptOptions = {}): string {
  const site = (options.site ?? SITE).replace(/\/+$/, '')
  const v = corpus.version
  const list = toggles(corpus)
  const chrome = list.filter((f) => f.layer === 'chrome').map(withDefaultMark)
  const cells = corpus.cellTypes.map((c) => c.type)
  const gaps = corpus.requirements.filter((r) => r.status !== 'built')

  return `# Bst-Table — agent prompt (v${v})

Build a React data grid with **Bst-Table**: the \`@bloomskill/table-*\` packages — a headless
TanStack Table v9 engine with swappable Material UI and shadcn/Radix skins, MIT/Apache
licensed throughout, no paid tiers. Master-detail, range selection and clipboard are all
included.

Treat this document as the API surface. No language model was trained on this library, so do
not carry props, imports, CSS class names or callbacks over from any other data grid. **If a
name is not in this prompt, look it up (§9) instead of inventing it** — a plausible flag that
does not exist is the most common way this goes wrong.

## 1. Pick one entry point

| Install | Render | You get |
| --- | --- | --- |
| \`@bloomskill/table-mui\` | \`<BstTableMui data columns />\` | toolbar, menus, pagination bar, MUI look |
| \`@bloomskill/table-shadcn\` | \`<BstTableShadcn data columns />\` | the same props, shadcn/Radix look |
| \`@bloomskill/table-engine\` | \`useBstTable()\` + \`<BstTable table />\` | the grid body only, no chrome |

Adapters peer-depend on the engine — install both, pinned to the same version:

\`\`\`bash
npm install @bloomskill/table-engine@${v} @bloomskill/table-mui@${v} @mui/material @emotion/react @emotion/styled
\`\`\`

Always import \`@bloomskill/table-engine/styles.css\`; the shadcn skin additionally needs
\`@bloomskill/table-shadcn/styles.css\`. Both adapters accept the same options, so a grid moves
between skins by changing the import and the component name — nothing else.

## 2. The rule that governs the whole API

Every capability is a **per-instance flag** on the grid component, in two layers:

- **\`enable*\` — engine behaviour.** Whether the capability runs at all.
- **\`show*\` — adapter chrome.** Whether the button / menu / bar renders.

Chrome follows behaviour: a \`show*\` flag is a no-op while its \`enable*\` is off, and never
switches behaviour on. **Passing an options object means enabled** —
\`pagination={{ pageSize: 25 }}\`, \`enableEditing={{ mode: 'batch' }}\`. Data operations default
**on**, so a zero-config grid already sorts, searches, filters and paginates; anything heavy or
opinionated (editing, selection, clipboard, export, virtualization) defaults **off**.

There is no \`<BstColumn>\` element, no per-feature provider and no plugin registration step:
it is flags on one component.

## 3. Minimum viable grid

\`\`\`tsx
import { BstTableMui } from '@bloomskill/table-mui'
import type { BstTableColumn } from '@bloomskill/table-engine'
import '@bloomskill/table-engine/styles.css'

interface Row { id: string; name: string; amount: number; active: boolean }

const columns: BstTableColumn<Row>[] = [
  { id: 'name', accessorKey: 'name', header: 'Name' },
  { id: 'amount', accessorKey: 'amount', header: 'Amount', meta: { type: 'number' } },
  { id: 'active', accessorKey: 'active', header: 'Active', meta: { type: 'boolean' } },
]

export function Grid({ rows }: { rows: Row[] }) {
  return <BstTableMui data={rows} columns={columns} getRowId={(row) => row.id} />
}
\`\`\`

That already has sorting, global search, per-column filters, column hiding/resizing and
pagination. Add capabilities by adding flags, not by rewriting the component.

## 4. Columns

Columns are **TanStack Table v9 column defs** (\`id\`, \`accessorKey\`/\`accessorFn\`, \`header\`,
\`size\`, \`aggregationFn\`, …) plus a Bst-Table \`meta\` object:

\`\`\`tsx
{
  id: 'status', accessorKey: 'status', header: 'Status',
  meta: {
    type: 'singleSelect',                 // which cell renderer/editor to use (§5)
    editable: true,                       // this column can be edited
    options: [{ value: 'open', label: 'Open', color: '#2563eb' }],
    cellMeta: { /* per-type options, e.g. pattern, fitChips, variant */ },
    disabled: (row) => row.locked,        // access control, per cell
    responsivePriority: 3,                // higher survives longer as the grid narrows
  },
}
\`\`\`

## 5. Cell types — ${cells.length} built in, all dependency-free

Set \`meta.type\` rather than hand-writing \`columnDef.cell\`; you get the read renderer, the
editor, copy/export text and filtering behaviour together.

\`${cells.join('` · `')}\`

\`text\` is the default and the fallback for an unknown id. Write a custom type with
\`defineCellType\`, then start from the adapter preset so the built-ins survive:

\`\`\`tsx
import { defineCellType } from '@bloomskill/table-engine'
import { createMuiPreset } from '@bloomskill/table-mui'  // or createShadcnPreset

const cellTypes = createMuiPreset()   // every built-in type, already registered
cellTypes.register(myCellType)        // add a new id, or override an existing one
// <BstTableMui cellTypes={cellTypes} … />
\`\`\`

## 6. Every flag that exists in v${v}

Engine behaviour (\`*\` = on by default):

${engineFlagLines(list).join('\n')}

Adapter chrome: ${chrome.map((c) => `\`${c}\``).join(', ')}.

Non-boolean options worth knowing: \`data\`, \`columns\`, \`getRowId\`, \`onDataChange\`, \`onSave\`,
\`onCellCommit\`, \`cellTypes\`, \`conditionalFormats\`, \`classNames\`/\`styles\`, \`icons\`,
\`renderDetail\`, \`createRow\`, \`rowDisabled\`, \`cellDisabled\`, \`pageSizeOptions\`, \`gridState\`.

**Nothing else is a Bst-Table flag.** If you want a capability that is not listed above, say so
plainly instead of inventing a prop for it.

## 7. Rules that are easy to get wrong

1. **Editing needs three things**, not one: \`enableEditing\`, \`getRowId\` (writes target rows by
   id) and \`onDataChange\` (the grid is controlled — it never mutates your array). A column
   opts in with \`meta.editable: true\`.
2. **Batch mode saves once.** \`enableEditing={{ mode: 'batch' }}\` keeps every edit as a draft;
   \`onSave\` then fires **once per save action** with the whole change set — make exactly one
   request there, never one per cell. Throwing keeps the drafts so the user can retry;
   returning a \`BstSaveResult\` adopts the server's authoritative values and can fail
   individual rows.
3. **Clipboard implies cell selection** (\`enableClipboard\` turns on \`enableCellSelection\`);
   *paste* additionally needs \`enableEditing\`.
4. **Filter flags stack downward:** \`enableColumnFilterRow\` requires \`enableColumnFilters\`;
   \`enableSetFilter\` and \`enableMultiFilter\` require both.
5. **\`enableTypeToEdit\` needs editing *and* cell selection**, and is inert without both.
6. **Virtualization yields.** \`enableVirtualization\` renders un-windowed under master-detail,
   grouping, cell spanning and row pinning. \`enableColumnVirtualization\` requires it.
7. **\`fitColumns\` wins over sizing:** it suppresses \`enableColumnResizing\` and makes
   \`enableResponsive\` inert. \`enableResponsive\` needs \`meta.responsivePriority\` per column.
8. **\`enableUndoRedo\` needs \`onDataChange\`** — there is nothing to undo through otherwise.
9. **Server data** is a hook, not a flag: \`useBstDataSource(source)\` returns \`tableProps\` you
   spread onto the grid (manual sort/filter/paginate, plus \`loading\` and \`error\` for the
   overlays). \`useBstInfiniteDataSource\` is the fetch-on-scroll variant — pair it with
   \`enableVirtualization\` and \`pagination={false}\`.
10. **Not everything exists.** ${gaps.length} of ${corpus.requirements.length} spec leaves are
    still open — ${gaps.map((g) => `${g.id} ${g.title} (${g.status})`).join(' · ')}. Report a
    gap rather than generating code that pretends it works.

## 8. Style, don't fork

Bst-Table renders \`bst-*\` classes and CSS variables. Layer on top of them — \`classNames\`/
\`styles\` slots (root · table · header · row · cell · …), per-column \`meta.headerClassName\`,
\`conditionalFormats\` rules for data-driven cell/row formatting — rather than restyling by
overriding internals. The shadcn skin can inherit your app's design tokens with
\`theme="inherit"\`.

## 9. Looking things up

- **MCP server (best):** \`npx -y @bloomskill/table-mcp\` — ${corpus.docs.length} searchable doc
  chunks and ${corpus.api.length} exact type signatures, generated from this release's source.
  Tools: \`bst_search_docs\`, \`bst_get_feature\`, \`bst_get_cell_type\`, \`bst_get_api\`,
  \`bst_get_example\`, \`bst_scaffold_grid\`, \`bst_validate_config\`, \`bst_detect_version\`,
  \`bst_list_versions\`. Register it in Claude Code with
  \`claude mcp add bst-table -s user -- npx -y @bloomskill/table-mcp\`.
- **Plain text for any model:** ${site}/llms.txt (index) ·
  ${site}/llms-full.txt (the whole corpus).
- **Docs site:** ${site}/docs — feature guides, cell types, API reference, coverage matrix.
- **Runnable examples:** \`${corpus.examples.map((e) => e.name).join('`, `')}\`.

Before you present code: check every flag you used appears in §6, every \`meta.type\` in §5, and
every dependency in §7 is satisfied. With the MCP server available, run \`bst_validate_config\`
instead of checking by hand.
`
}
