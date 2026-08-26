#!/usr/bin/env node
/**
 * Cross-check: does the MCP server (`@bloomskill/table-mcp`) know every capability
 * the engine actually ships? The corpus is generated from §12 + READMEs, so a
 * feature the engine registers but nobody documented would be a silent blind spot.
 *
 * This asserts the runtime truth (the BUILT engine) is fully covered by the corpus:
 *   1. every default cell type the engine registers is in `corpus.cellTypes`
 *   2. every engine settings-sheet toggle is in `corpus.features`
 *   3. every lintable corpus toggle has a `rules.ts` dependency entry, and no rule
 *      references a flag the corpus doesn't surface (the check that caught `showFind`)
 *   4. the corpus carries the full agent surface — coverage matrix, API, examples,
 *      the install/setup guide, and per-flag `since` versions
 *
 * Runs in `npm run mcp` and CI, so a new engine capability that skips its §12 row /
 * README fails the build instead of quietly never reaching an AI agent.
 *
 * Prerequisite: the engine and MCP packages must be built (dist/ present). Run
 * `npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp` first.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const load = async (rel) => import(pathToFileURL(resolve(ROOT, rel)).href)

let corpus, defaultCellTypes, BST_SETTINGS_REGISTRY, RULES
try {
  corpus = JSON.parse(readFileSync(resolve(ROOT, 'packages/mcp/dist/corpus.json'), 'utf8'))
  ;({ defaultCellTypes } = await load('packages/engine/dist/registry/defaults.js'))
  ;({ BST_SETTINGS_REGISTRY } = await load('packages/engine/dist/settings.js'))
  ;({ RULES } = await load('packages/mcp/dist/rules.js'))
} catch (err) {
  console.error(
    `verify:mcp — could not load a build artifact (${err instanceof Error ? err.message : String(err)}).\n` +
      `Build first: npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp`,
  )
  process.exit(1)
}

let gaps = 0
const diff = (a, b) => [...a].filter((x) => !b.has(x))
const check = (ok, label, detail = '') => {
  if (!ok) gaps++
  console.log(`  ${ok ? '✓' : '✗ GAP'} ${label}${detail ? ` — ${detail}` : ''}`)
}

const corpusFlags = new Set(corpus.features.map((f) => f.flag))

console.log('verify:mcp — MCP corpus vs. engine runtime truth\n')

// 1. Cell types the engine registers by default ⊆ what the corpus documents.
const engineCells = new Set(defaultCellTypes.map((c) => c.id))
const cellGap = diff(engineCells, new Set(corpus.cellTypes.map((t) => t.type)))
console.log(`[1] Cell types — engine registers ${engineCells.size}, corpus documents ${corpus.cellTypes.length}`)
check(cellGap.length === 0, 'every engine cell type is in the corpus', cellGap.length ? `MISSING: ${cellGap.join(', ')}` : '')

// 2. Engine settings-sheet toggles ⊆ corpus features.
const toggleGap = diff(new Set(BST_SETTINGS_REGISTRY.map((e) => e.key)), corpusFlags)
console.log(`[2] Engine toggles — BST_SETTINGS_REGISTRY has ${BST_SETTINGS_REGISTRY.length}, corpus has ${corpusFlags.size} flags`)
check(toggleGap.length === 0, 'every engine settings toggle is in the corpus', toggleGap.length ? `MISSING: ${toggleGap.join(', ')}` : '')

// 3. Validation rules ⇄ corpus toggles (both directions).
const ruleKeys = new Set(Object.keys(RULES))
const corpusToggles = new Set(corpus.features.filter((f) => f.kind === 'toggle').map((f) => f.flag))
const missingRules = diff(corpusToggles, ruleKeys)
const orphanRules = diff(ruleKeys, corpusFlags)
console.log(`[3] Validation rules — ${ruleKeys.size} rules for ${corpusToggles.size} lintable toggles`)
check(missingRules.length === 0, 'every corpus toggle has a dependency rule', missingRules.length ? `MISSING: ${missingRules.join(', ')}` : '')
check(orphanRules.length === 0, 'no rule references a flag the corpus lacks', orphanRules.length ? `ORPHANS: ${orphanRules.join(', ')}` : '')

// 4. Every enable*/show* flag DECLARED in engine + adapter source is surfaced by
//    the corpus. This is the one surface the compile-time settings guard does NOT
//    cover — an adapter `show*` prop (or any option) added without a §12 row.
const SRC_DIRS = ['packages/engine/src', 'packages/mui/src', 'packages/shadcn/src']
// NOT Bst-Table public grid flags: TanStack's per-column columnDef options set
// internally (columns.ts), a virtualization helper param, and a doc example.
const NON_FLAG_ALLOWLIST = new Set([
  'enableColumnFilter', // TanStack per-column columnDef option (≠ our enableColumnFilters)
  'enableResizing', // TanStack per-column option (our flag is enableColumnResizing)
  'enablePinning', // TanStack per-column option (our flags are enableColumn/RowPinning)
  'enableColumns', // a boolean parameter of the virtualization helper
  'enableFoo', // a placeholder in a settings.ts doc comment
])
function walkTs(dir) {
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) out.push(...walkTs(p))
    else if (/\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}
const knownWithRelated = new Set()
for (const f of corpus.features) {
  knownWithRelated.add(f.flag)
  for (const r of f.related ?? []) knownWithRelated.add(r)
}
const declared = new Set()
for (const d of SRC_DIRS) {
  for (const file of walkTs(resolve(ROOT, d))) {
    for (const m of readFileSync(file, 'utf8').matchAll(/\b((?:enable|show)[A-Z][A-Za-z0-9]*)\s*\??\s*:/g)) {
      declared.add(m[1])
    }
  }
}
const flagGap = [...declared].filter((x) => !knownWithRelated.has(x) && !NON_FLAG_ALLOWLIST.has(x)).sort()
console.log(`[4] Source flags — ${declared.size} enable*/show* declared across engine + both adapters`)
check(
  flagGap.length === 0,
  'every user-facing flag in source is surfaced by the corpus',
  flagGap.length ? `NOT IN MCP: ${flagGap.join(', ')} — add a §12 row (or allowlist if it is a TanStack/internal name)` : '',
)

// 5. The full agent surface — install through every feature.
console.log('[5] Corpus surface')
check(corpus.requirements.length === 58, 'spec coverage matrix present', `${corpus.requirements.length} leaves`)
check(corpus.api.length > 200, 'engine API signatures present', `${corpus.api.length} exports`)
check(corpus.examples.length >= 6, 'runnable examples present', `${corpus.examples.length} apps`)
check(corpus.docs.some((d) => d.source.includes('mcp-server')), 'install / setup guide indexed', 'easy installation')
check(corpus.features.filter((f) => f.since).length > 60, 'per-flag version (since) info present', `${corpus.features.filter((f) => f.since).length}/${corpus.features.length} flags`)

console.log(
  gaps === 0
    ? '\n✔ verify:mcp — FULL COVERAGE: the MCP server knows every engine capability, from install to every feature.'
    : `\n✗ verify:mcp — ${gaps} gap(s). Add the missing §12 row / README entry / rule so the feature reaches AI agents.`,
)
process.exit(gaps === 0 ? 0 : 1)
