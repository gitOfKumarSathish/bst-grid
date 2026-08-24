#!/usr/bin/env node
/**
 * gen-features.mjs — generate the Feature Guides section of the docs from the
 * Bst-Table MCP corpus. Emits one MDX page per feature toggle, grouped, plus a
 * category file + index per group. Re-run on every version bump: the pages are
 * build artifacts and cannot drift from the code.
 *
 *   inputs : features.json, requirements.json, rules.json  (dumped from the MCP)
 *   output : <OUT>/features/<group-slug>/<flag>.mdx  (+ _category_.json, index.mdx)
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] || 'apps/docs/docs'
const FEATURES = JSON.parse(readFileSync('features.json', 'utf8'))
const REQS = JSON.parse(readFileSync('requirements.json', 'utf8'))
const RULES = JSON.parse(readFileSync('rules.json', 'utf8'))
const reqById = Object.fromEntries(REQS.map((r) => [r.id, r]))

// ---- docs taxonomy: 8 settings-sheet groups + a chrome bucket -------------
const GROUPS = [
  ['Data operations', 'data-operations', 'Sorting, filtering, search, pagination and grouping.'],
  ['Columns', 'columns', 'Show/hide, resize, pin, reorder and size columns.'],
  ['Rows', 'rows', 'Selection, expansion, pinning, sizing and sticky header.'],
  ['Editing', 'editing', 'Inline, row and batch editing, validation and undo/redo.'],
  ['Selection & clipboard', 'selection-clipboard', 'Cell/range selection and Excel-like copy/paste.'],
  ['Display', 'display', 'Density, conditional formatting, overlays and status bar.'],
  ['Performance', 'performance', 'Virtualization and infinite scroll for large datasets.'],
  ['Export', 'export', 'CSV, Excel and print output.'],
  ['Toolbar & chrome', 'toolbar-chrome', 'General adapter chrome — toolbar, settings sheet, shortcuts.'],
]
const SLUG = Object.fromEntries(GROUPS.map(([name, slug]) => [name, slug]))
const POS = Object.fromEntries(GROUPS.map(([name], i) => [name, i + 1]))

// The 13 chrome (show*) toggles that carry no settings-sheet group of their own.
const SHOW_GROUP = {
  showSearch: 'Data operations',
  showPagination: 'Data operations',
  showColumnsMenu: 'Columns',
  showColumnEditToggle: 'Columns',
  showAddRow: 'Editing',
  showSaveBar: 'Editing',
  showUndoRedo: 'Editing',
  showChangesSheet: 'Editing',
  showSelectionInfo: 'Selection & clipboard',
  showExport: 'Export',
  showToolbar: 'Toolbar & chrome',
  showSettings: 'Toolbar & chrome',
  showShortcuts: 'Toolbar & chrome',
}

const groupOf = (f) => f.group || SHOW_GROUP[f.flag] || null

// ---- MDX safety -----------------------------------------------------------
// MDX v3 reads raw `<` as JSX and `{` as an expression. Inside backtick code it
// is literal, so we only escape the NON-code segments of each string.
function mdxSafe(s, { inTableCell = false } = {}) {
  if (!s) return ''
  const parts = String(s).split(/(`[^`]*`)/) // keep code spans intact
  const out = parts
    .map((seg) => {
      if (seg.startsWith('`') && seg.endsWith('`')) {
        return inTableCell ? seg.replace(/\|/g, '\\|') : seg
      }
      let t = seg.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      if (inTableCell) t = t.replace(/\|/g, '\\|')
      return t
    })
    .join('')
  return out
}
const code = (s) => '`' + s + '`'
const codeCell = (s) => '`' + String(s).replace(/\|/g, '\\|') + '`' // pipe-safe inside table cells
const fmDefault = (d) => (d === 'true' ? 'on' : d === 'false' ? 'off' : d)

// ---- per-page render ------------------------------------------------------
function renderPage(f) {
  const L = []
  const isChrome = f.layer === 'chrome'
  L.push('---')
  L.push(`id: ${f.flag}`)
  L.push(`title: ${f.feature.replace(/:/g, ' -')}`)
  L.push(`sidebar_label: ${f.flag}`)
  L.push('---')
  L.push('')
  L.push(`# ${mdxSafe(f.feature)}`)
  L.push('')
  L.push(`Prop \`${f.flag}\` — ${isChrome ? 'adapter chrome' : 'engine behaviour'}, `
    + `default \`${f.default}\`.`)
  L.push('')

  // Overview
  L.push('## Overview')
  L.push('')
  L.push('| | |')
  L.push('| --- | --- |')
  L.push(`| Layer | ${f.layer === 'engine' ? '`enable*` (engine, resolved in `useBstTable`)' : '`show*` (chrome, resolved in the adapter)'} |`)
  L.push(`| Type | ${codeCell(f.type)} |`)
  L.push(`| Default | ${codeCell(f.default)} |`)
  if (f.mapsTo) L.push(`| Maps to | ${mdxSafe(f.mapsTo, { inTableCell: true })} |`)
  if (f.status) L.push(`| Status | ${mdxSafe(f.status, { inTableCell: true })} |`)
  if (f.group) L.push(`| Settings sheet | ${f.group} |`)
  L.push('')
  if (f.doc) { L.push(mdxSafe(f.doc)); L.push('') }

  // Enable it
  L.push('## Enable it')
  L.push('')
  L.push('```tsx')
  if (isChrome) {
    const req = RULES[f.flag]?.requires?.[0]
    L.push('<BstTableMui')
    L.push('  data={rows}')
    L.push('  columns={columns}')
    if (req) L.push(`  ${req}          // chrome is a no-op without its behaviour flag`)
    L.push(`  ${f.flag}`)
    L.push('/>')
  } else {
    L.push('<BstTableMui')
    L.push('  data={rows}')
    L.push('  columns={columns}')
    L.push(f.type === 'boolean' ? `  ${f.flag}` : `  ${f.flag}={/* ${f.type} */}`)
    L.push('/>')
  }
  L.push('```')
  L.push('')
  L.push('> Swap `BstTableMui` for `BstTableShadcn` (and the CSS import) for the shadcn skin — same props.')
  L.push('')

  // Options (related props beyond the flag itself, + rule-required options)
  const opts = (f.related || []).filter((r) => r !== f.flag)
  const needs = RULES[f.flag]?.needsOptions || []
  if (opts.length || needs.length) {
    L.push('## Options')
    L.push('')
    L.push('| Option | Notes |')
    L.push('| --- | --- |')
    for (const o of opts) L.push(`| ${code(o)} | Related prop for this feature. |`)
    for (const n of needs) L.push(`| ${code(n.name)} | ${mdxSafe(n.why, { inTableCell: true })} |`)
    L.push('')
  }

  // Behavior & interactions (from the validation RULES)
  const rule = RULES[f.flag]
  const inter = []
  if (rule?.requires?.length) inter.push(`**Requires** ${rule.requires.map(code).join(', ')} to be on — this flag is a no-op otherwise.`)
  if (rule?.implies?.length) inter.push(`**Implies** ${rule.implies.map(code).join(', ')} (turned on for you).`)
  if (rule?.conflictsWith?.length) for (const c of rule.conflictsWith) inter.push(`**Conflicts with** ${code(c.flag)} — ${mdxSafe(c.why)}.`)
  if (rule?.note) inter.push(mdxSafe(rule.note))
  if (isChrome && !rule?.requires?.length) inter.push('Chrome flag: it only renders its control when the matching `enable*` behaviour is on.')
  if (inter.length) {
    L.push('## Behavior & interactions')
    L.push('')
    for (const line of inter) { L.push(`- ${line}`) }
    L.push('')
  }

  // Spec coverage
  const leaves = (f.requirements || []).map((id) => reqById[id]).filter(Boolean)
  if (leaves.length) {
    L.push('## Spec coverage')
    L.push('')
    for (const leaf of leaves) {
      const badge = leaf.status === 'built' ? '✅ built' : leaf.status === 'partial' ? '🟡 partial' : '❌ not built'
      L.push(`- **${leaf.id} · ${mdxSafe(leaf.title)}** — ${badge}. ${mdxSafe(leaf.notes)}`)
    }
    L.push('')
  }
  return L.join('\n')
}

// ---- write tree -----------------------------------------------------------
const featRoot = join(OUT, 'features')
rmSync(featRoot, { recursive: true, force: true })
mkdirSync(featRoot, { recursive: true })

// top-level category + index
writeFileSync(join(featRoot, '_category_.json'), JSON.stringify({ label: 'Feature Guides', position: 3, collapsible: true, collapsed: false }, null, 2))

const toggles = FEATURES.filter((f) => f.kind === 'toggle')
const byGroup = {}
for (const f of toggles) {
  const g = groupOf(f)
  if (!g) { console.warn('UNMAPPED toggle:', f.flag); continue }
  ;(byGroup[g] = byGroup[g] || []).push(f)
}

let pageCount = 0
for (const [name, slug, blurb] of GROUPS) {
  const items = (byGroup[name] || []).sort((a, b) => a.flag.localeCompare(b.flag))
  if (!items.length) continue
  const dir = join(featRoot, slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_category_.json'), JSON.stringify({ label: name, position: POS[name], link: { type: 'doc', id: `features/${slug}/index` } }, null, 2))
  // group index
  const idx = [
    '---', `id: index`, `title: ${name}`, `sidebar_label: Overview`, '---', '',
    `# ${name}`, '', blurb, '', '| Feature | Flag | Default |', '| --- | --- | --- |',
    ...items.map((f) => `| [${mdxSafe(f.feature, { inTableCell: true })}](./${f.flag}) | ${code(f.flag)} | ${code(f.default)} |`),
    '',
  ].join('\n')
  writeFileSync(join(dir, 'index.mdx'), idx)
  for (const f of items) { writeFileSync(join(dir, `${f.flag}.mdx`), renderPage(f)); pageCount++ }
}

// features landing page
const landing = [
  '---', 'id: features-index', 'title: Feature Guides', 'sidebar_label: Overview', 'slug: /features', '---', '',
  '# Feature Guides', '',
  `Every Bst-Table capability is a per-instance flag: \`enable*\` = engine behaviour, \`show*\` = adapter chrome. `
  + `Data features default on; heavy features default off. ${toggles.length} feature toggles across ${GROUPS.filter(([n]) => byGroup[n]?.length).length} groups.`,
  '',
  '| Group | Features |', '| --- | --- |',
  ...GROUPS.filter(([n]) => byGroup[n]?.length).map(([n, s]) => `| [${n}](./${s}/index.mdx) | ${byGroup[n].length} |`),
  '',
  '_These pages are generated from the `@bloomskill/table-mcp` corpus and regenerate on every release._',
  '',
].join('\n')
writeFileSync(join(featRoot, 'index.mdx'), landing)

console.log(`generated ${pageCount} feature pages across ${GROUPS.filter(([n]) => byGroup[n]?.length).length} groups → ${featRoot}`)
