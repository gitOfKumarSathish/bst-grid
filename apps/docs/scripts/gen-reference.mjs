#!/usr/bin/env node
/**
 * gen-reference.mjs — generate Cell Types, API Reference and Coverage sections
 * from the Bst-Table corpus. Build artifacts; rerun on every version bump.
 *   inputs : cells.json, api-sigs.json, requirements.json, features.json
 *   output : <OUT>/cell-types/**, <OUT>/api/**, <OUT>/coverage.mdx
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2] || 'apps/docs/docs'
const CELLS = JSON.parse(readFileSync('cells.json', 'utf8'))
const API = JSON.parse(readFileSync('api-sigs.json', 'utf8'))
const REQS = JSON.parse(readFileSync('requirements.json', 'utf8'))
const FEATURES = JSON.parse(readFileSync('features.json', 'utf8'))

// ---- MDX safety (escape stray <,{,},| outside inline code) ----------------
function mdxSafe(s, { inTableCell = false } = {}) {
  if (s == null) return ''
  return String(s)
    .split(/(`[^`]*`)/)
    .map((seg) => {
      if (seg.startsWith('`') && seg.endsWith('`')) return inTableCell ? seg.replace(/\|/g, '\\|') : seg
      let t = seg.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\{/g, '&#123;').replace(/\}/g, '&#125;')
      if (inTableCell) t = t.replace(/\|/g, '\\|')
      return t
    })
    .join('')
}
const code = (s) => '`' + s + '`'
const codeCell = (s) => '`' + String(s).replace(/\|/g, '\\|') + '`' // pipe-safe inside tables
const cleanDoc = (s) => String(s || '').replace(/\{@link(?:code)?\s+([^}|]+?)(?:\s*\|\s*([^}]+))?\}/g, (_, a, b) => '`' + (b || a).trim() + '`')
// Prose pulled from a README may link to a heading anchor that exists there but
// NOT on the generated page — drop the dangling `[text](#anchor)`, keep the text.
const dropSelfAnchors = (s) => String(s || '').replace(/\[([^\]]*)\]\(#[^)]*\)/g, '$1')
// Render a JSDoc string: prose escaped for MDX, embedded ```code``` re-emitted as real fenced blocks.
function renderDoc(doc) {
  if (!doc) return ''
  const parts = String(doc).split(/```(\w*)\n?([\s\S]*?)```/g)
  const out = []
  for (let i = 0; i < parts.length;) {
    const prose = parts[i++]
    if (prose && prose.trim()) out.push(mdxSafe(cleanDoc(prose)).trim())
    if (i < parts.length) {
      const lang = parts[i++] || 'tsx'
      const seg = (parts[i++] || '').trim()
      out.push('```' + lang + '\n' + seg + '\n```')
    }
  }
  return out.join('\n\n')
}

// ---------------------------------------------------------------------------
// 1. CELL TYPES
// ---------------------------------------------------------------------------
function genCells() {
  const dir = join(OUT, 'cell-types')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_category_.json'), JSON.stringify({ label: 'Cell Types', position: 4, link: { type: 'doc', id: 'cell-types/index' } }, null, 2))

  const rows = CELLS.map((c) => `| [${codeCell(c.type)}](./${c.type}.mdx) | ${mdxSafe(c.renders, { inTableCell: true })} | ${mdxSafe(c.editable, { inTableCell: true })} |`)
  writeFileSync(join(dir, 'index.mdx'), [
    '---', 'id: index', 'title: Cell Types', 'sidebar_label: Overview', 'slug: /cell-types', '---', '',
    '# Cell Types', '',
    `A column's renderer + editor is chosen by \`meta.type\`. ${CELLS.length} built-in types ship, all dependency-free inline SVG, extensible via the cell-type registry.`,
    '', '![Bst-Table cell types — sparkline, KPI, coloured status badges, multi-select chips and a boolean check](/img/cells-showcase.png)', '',
    'Try it live — edit the code and the grid updates:', '',
    '<BstSandbox example="showcase" />', '',
    '| Type | Renders | Editable |', '| --- | --- | --- |', ...rows, '',
    '_Generated from the `@bloomskill/table-mcp` corpus._', '',
  ].join('\n'))

  for (const c of CELLS) {
    const L = ['---', `id: ${c.type}`, `title: ${c.type}`, `sidebar_label: ${c.type}`, '---', '',
      `# \`${c.type}\``, '', mdxSafe(c.renders) + '.', '',
      '## At a glance', '', '| | |', '| --- | --- |',
      `| Renders | ${mdxSafe(c.renders, { inTableCell: true })} |`,
      `| Value shape | ${codeCell(c.valueShape)} |`,
      `| Editable | ${mdxSafe(c.editable, { inTableCell: true })} |`,
      `| Key \`cellMeta\` | ${mdxSafe(c.cellMeta, { inTableCell: true })} |`, '',
      '## Use it', '', '```tsx',
      'const columns: BstTableColumn<Row>[] = [',
      `  { id: 'x', accessorKey: 'x', header: 'X', meta: { type: '${c.type}'${c.cellMeta && c.cellMeta !== '—' ? ', /* cellMeta below */' : ''} } },`,
      ']', '```', '']
    if (c.cellMetaDetail) { L.push('## `cellMeta` options', '', mdxSafe(dropSelfAnchors(c.cellMetaDetail)), '') }
    writeFileSync(join(dir, `${c.type}.mdx`), L.join('\n'))
  }
  return CELLS.length
}

// ---------------------------------------------------------------------------
// 2. API REFERENCE
// ---------------------------------------------------------------------------
const cleanSig = (s) => s
  .replace(/import\("[^"]*"\)\./g, '') // drop import() path prefixes
  .replace(/^export\s+(declare\s+)?/, '') // drop export/declare boilerplate

function apiBucket(e) {
  if (e.kind === 'function') return /^use[A-Z]/.test(e.symbol) ? 'Hooks' : 'Functions'
  if (e.kind === 'interface') return 'Interfaces'
  if (e.kind === 'type') return 'Types'
  if (e.kind === 'const') return 'Constants'
  return 'Other'
}
const API_ORDER = [
  ['Hooks', 'hooks', 'React hooks — the engine entry points.'],
  ['Functions', 'functions', 'Standalone helpers and factories.'],
  ['Interfaces', 'interfaces', 'Option bags, props and shape contracts.'],
  ['Types', 'types', 'Type aliases and unions.'],
  ['Constants', 'constants', 'Exported constants and registries.'],
  ['Other', 'other', 'Everything else.'],
]

function genApi() {
  const dir = join(OUT, 'api')
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, '_category_.json'), JSON.stringify({ label: 'API Reference', position: 5, link: { type: 'doc', id: 'api/index' } }, null, 2))

  const buckets = {}
  for (const e of API) (buckets[apiBucket(e)] = buckets[apiBucket(e)] || []).push(e)

  // landing
  writeFileSync(join(dir, 'index.mdx'), [
    '---', 'id: index', 'title: API Reference', 'sidebar_label: Overview', 'slug: /api', '---', '',
    '# API Reference', '',
    `Every public export of \`@bloomskill/table-engine\` (${API.length} symbols), with signatures read from the built \`.d.ts\` — so they match what the compiler accepts.`,
    '', '| Group | Exports |', '| --- | --- |',
    ...API_ORDER.filter(([n]) => buckets[n]?.length).map(([n, s]) => `| [${n}](./${s}.mdx) | ${buckets[n].length} |`),
    '', '_Generated from the engine type declarations; regenerated every release._', '',
  ].join('\n'))

  let pos = 1
  for (const [name, slug, blurb] of API_ORDER) {
    const items = (buckets[name] || []).sort((a, b) => a.symbol.localeCompare(b.symbol))
    if (!items.length) continue
    const L = ['---', `id: ${slug}`, `title: ${name}`, `sidebar_label: ${name}`, `sidebar_position: ${pos++}`, '---', '',
      `# ${name}`, '', blurb, '']
    for (const e of items) {
      L.push(`## ${e.symbol}`, '')
      if (e.doc) { L.push(renderDoc(e.doc), '') }
      L.push('```ts', cleanSig(e.signature), '```', '')
    }
    writeFileSync(join(dir, `${slug}.mdx`), L.join('\n'))
  }
  return API.length
}

// ---------------------------------------------------------------------------
// 3. COVERAGE
// ---------------------------------------------------------------------------
function genCoverage() {
  const badge = (s) => (s === 'built' ? '✅ built' : s === 'partial' ? '🟡 partial' : '❌ not built')
  const cat = (id) => id.replace(/[0-9]+$/, '')
  const implementers = (id) => FEATURES.filter((f) => (f.requirements || []).includes(id)).map((f) => f.flag)

  const byCat = {}
  for (const r of REQS) (byCat[cat(r.id)] = byCat[cat(r.id)] || []).push(r)
  const counts = REQS.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})

  const L = ['---', 'id: coverage', 'title: Feature Coverage & Roadmap', 'sidebar_label: Coverage & Roadmap', 'sidebar_position: 9', '---', '',
    '# Feature Coverage & Roadmap', '',
    `Requirement-by-requirement status across ${REQS.length} spec leaves: `
    + `**${counts.built || 0} built**, **${counts.partial || 0} partial**, **${counts.missing || 0} not built**. `
    + `Honest status, straight from the spec matrix.`, '']
  for (const c of Object.keys(byCat).sort()) {
    L.push(`## ${c}`, '', '| Leaf | Requirement | Status | Notes | Flags |', '| --- | --- | --- | --- | --- |')
    for (const r of byCat[c].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
      const flags = implementers(r.id).map(code).join(', ') || '—'
      L.push(`| ${r.id} | ${mdxSafe(r.title, { inTableCell: true })} | ${badge(r.status)} | ${mdxSafe(r.notes, { inTableCell: true })} | ${flags} |`)
    }
    L.push('')
  }
  L.push('_Generated from the corpus coverage matrix._', '')
  writeFileSync(join(OUT, 'coverage.mdx'), L.join('\n'))
  return REQS.length
}

const nc = genCells()
const na = genApi()
const nr = genCoverage()
console.log(`cell-types: ${nc} pages · api: ${na} exports · coverage: ${nr} leaves → ${OUT}`)
