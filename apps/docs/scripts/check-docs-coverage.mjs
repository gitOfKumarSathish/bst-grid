#!/usr/bin/env node
/**
 * check-docs-coverage.mjs — fail the build if any Bst-Table feature, cell type,
 * or engine export is missing from the generated docs. Mirrors the guarantee
 * bst_validate_config gives for configs: docs completeness is enforced, not hoped.
 *
 *   usage: node scripts/check-docs-coverage.mjs [docsDir]
 *   exit 0 = fully covered · exit 1 = something undocumented
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DOCS = process.argv[2] || 'apps/docs/docs'
const FEATURES = JSON.parse(readFileSync('features.json', 'utf8'))
const CELLS = JSON.parse(readFileSync('cells.json', 'utf8'))
const API = JSON.parse(readFileSync('api-sigs.json', 'utf8'))

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
  }
  return out
}
const files = walk(DOCS)
const readAll = (pred) => files.filter(pred).map((f) => readFileSync(f, 'utf8')).join('\n')

const featureFiles = files.filter((f) => f.includes('/features/'))
const cellFiles = files.filter((f) => f.includes('/cell-types/'))
const apiText = readAll((f) => f.includes('/api/'))

const missing = { flags: [], cells: [], api: [] }

// 1. every toggle flag has its own page  features/**/<flag>.mdx
for (const f of FEATURES.filter((x) => x.kind === 'toggle')) {
  if (!featureFiles.some((p) => p.endsWith(`/${f.flag}.mdx`))) missing.flags.push(f.flag)
}
// 2. every cell type has its own page
for (const c of CELLS) {
  if (!cellFiles.some((p) => p.endsWith(`/${c.type}.mdx`))) missing.cells.push(c.type)
}
// 3. every API export appears as a "## <symbol>" heading in the api section
for (const e of API) {
  if (!apiText.includes(`## ${e.symbol}\n`) && !apiText.includes(`## ${e.symbol}\r`)) missing.api.push(e.symbol)
}

const total = missing.flags.length + missing.cells.length + missing.api.length
const nTog = FEATURES.filter((x) => x.kind === 'toggle').length
console.log(`docs coverage: ${nTog - missing.flags.length}/${nTog} flags · ${CELLS.length - missing.cells.length}/${CELLS.length} cell types · ${API.length - missing.api.length}/${API.length} exports`)
if (total === 0) {
  console.log('✅ every feature, cell type and export is documented.')
  process.exit(0)
}
if (missing.flags.length) console.error('❌ undocumented flags:', missing.flags.join(', '))
if (missing.cells.length) console.error('❌ undocumented cell types:', missing.cells.join(', '))
if (missing.api.length) console.error(`❌ undocumented exports (${missing.api.length}):`, missing.api.slice(0, 20).join(', ') + (missing.api.length > 20 ? ' …' : ''))
process.exit(1)
