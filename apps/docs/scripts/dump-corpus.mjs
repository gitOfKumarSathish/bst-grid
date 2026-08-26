#!/usr/bin/env node
/**
 * dump-corpus.mjs — THE missing bridge (pipeline step 1 in this folder's README).
 *
 * Dumps the generated MCP corpus (`packages/mcp/dist/corpus.json`) plus the
 * validation `RULES` into the four static JSON inputs the docs generators read:
 * `features.json`, `cells.json`, `requirements.json`, `rules.json`.
 *
 * Previously this step existed only as PROSE in README.md — so those four files
 * were hand-frozen snapshots that drifted from the code, and a new feature never
 * reached the docs until someone re-dumped them by hand. Now `npm run gen:docs`
 * runs this first, so the docs regenerate from the corpus every time and
 * `check-docs-coverage.mjs` enforces completeness.
 *
 * The corpus is itself generated from source at MCP build time (§12 registry,
 * engine types, COVERAGE.md, the built .d.ts, READMEs, examples), so the whole
 * chain is engine → corpus → these JSONs → MDX, with no hand-maintained middle.
 *
 * Prerequisite: build the MCP package first so its corpus is current —
 *   npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url)) // apps/docs/scripts
const ROOT = resolve(HERE, '../../..') // repo root
const CORPUS = resolve(ROOT, 'packages/mcp/dist/corpus.json')
const RULES_JS = resolve(ROOT, 'packages/mcp/dist/rules.js')

let corpus, RULES
try {
  corpus = JSON.parse(readFileSync(CORPUS, 'utf8'))
  ;({ RULES } = await import(pathToFileURL(RULES_JS).href))
} catch (err) {
  console.error(
    `dump-corpus — could not read the MCP corpus (${err instanceof Error ? err.message : String(err)}).\n` +
      `Build it first: npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp`,
  )
  process.exit(1)
}

// features.json — every corpus feature, in the shape gen-features / gen-reference
// read. Optional fields (mapsTo, group, doc, related, requirements, since) are
// included when present; JSON.stringify drops the ones that are undefined.
const features = corpus.features.map((f) => ({
  flag: f.flag,
  feature: f.feature,
  layer: f.layer,
  kind: f.kind,
  type: f.type,
  default: f.default,
  status: f.status,
  mapsTo: f.mapsTo,
  group: f.group,
  doc: f.doc,
  related: f.related,
  requirements: f.requirements,
  since: f.since,
}))

// cells.json — every cell type, including the per-field cellMeta detail.
const cells = corpus.cellTypes.map((c) => ({
  type: c.type,
  renders: c.renders,
  valueShape: c.valueShape,
  editable: c.editable,
  cellMeta: c.cellMeta,
  cellMetaDetail: c.cellMetaDetail,
}))

// requirements.json — the coverage matrix, verbatim.
const requirements = corpus.requirements.map((r) => ({
  id: r.id,
  title: r.title,
  status: r.status,
  notes: r.notes,
}))

const write = (name, data) => writeFileSync(resolve(HERE, name), `${JSON.stringify(data, null, 2)}\n`)
write('features.json', features)
write('cells.json', cells)
write('requirements.json', requirements)
write('rules.json', RULES)

console.log(
  `dumped corpus v${corpus.version} → features(${features.length}) · cells(${cells.length}) · ` +
    `requirements(${requirements.length}) · rules(${Object.keys(RULES).length})`,
)
