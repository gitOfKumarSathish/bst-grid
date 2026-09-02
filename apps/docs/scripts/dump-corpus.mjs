#!/usr/bin/env node
/**
 * dump-corpus.mjs — THE missing bridge (pipeline step 1 in this folder's README).
 *
 * Dumps the generated MCP corpus (`packages/mcp/dist/corpus.json`) plus the
 * validation `RULES` into the four static JSON inputs the docs generators read:
 * `features.json`, `cells.json`, `requirements.json`, `rules.json`.
 *
 * It also renders the **agent prompt** — the paste-anywhere briefing behind the
 * site's "Copy agent prompt" button — in the two shapes the site needs:
 * `scripts/prompt.json` (imported by the button component) and
 * `static/prompt.txt` (served at the site root, so `curl` and any crawler can
 * fetch it). Both come from `buildAgentPrompt(corpus)`, the same function behind
 * the `bst://prompt` MCP resource and `npx @bloomskill/table-mcp prompt`.
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
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url)) // apps/docs/scripts
const ROOT = resolve(HERE, '../../..') // repo root
const STATIC = resolve(HERE, '..', 'static')
const CORPUS = resolve(ROOT, 'packages/mcp/dist/corpus.json')
const RULES_JS = resolve(ROOT, 'packages/mcp/dist/rules.js')
const PROMPT_JS = resolve(ROOT, 'packages/mcp/dist/agent-prompt.js')

let corpus, RULES, buildAgentPrompt
try {
  corpus = JSON.parse(readFileSync(CORPUS, 'utf8'))
  ;({ RULES } = await import(pathToFileURL(RULES_JS).href))
  ;({ buildAgentPrompt } = await import(pathToFileURL(PROMPT_JS).href))
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
const rawFeatures = corpus.features.map((f) => ({
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

// Dedupe TOGGLE flags. A few §12 rows document a *mode* of an existing flag with a
// compound flag string (e.g. `enableEditing: { mode: 'batch' }`), which the corpus
// reduces to the base flag — yielding a SECOND toggle entry for that flag whose
// name / mapsTo describe the mode, not the flag. gen-features writes one page per
// flag, so the later entry silently overwrote the base page (the `enableEditing`
// page showed "Batch editing + single-call save" instead of "Inline editing", with
// the batch `Maps to` — batch mode has its own flag, `enableBatchEditing`). Keep the
// FIRST (canonical) entry per flag and merge any later duplicate's spec
// `requirements` into it so the coverage matrix keeps every leaf. Non-toggle rows
// (cellMeta, `meta.type`, …) legitimately share a key and pass through untouched.
const canonicalByFlag = new Map()
const features = []
for (const f of rawFeatures) {
  if (f.kind === 'toggle' && f.flag) {
    const canonical = canonicalByFlag.get(f.flag)
    if (canonical) {
      canonical.requirements = [...new Set([...(canonical.requirements || []), ...(f.requirements || [])])]
      console.warn(`dump-corpus — folded duplicate toggle "${f.feature}" into canonical \`${f.flag}\` ("${canonical.feature}")`)
      continue
    }
    canonicalByFlag.set(f.flag, f)
  }
  features.push(f)
}

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

// The agent prompt, rendered for the site. The base URL comes from the real
// Docusaurus config so the lookup links point at wherever this build deploys;
// falling back to the generator's own default if the config can't be read.
let site
try {
  const cfg = createRequire(import.meta.url)('../docusaurus.config.js')
  site = `${cfg.url}${cfg.baseUrl}`.replace(/\/+$/, '')
} catch {
  /* isolated run — buildAgentPrompt falls back to the published site */
}
const agentPrompt = buildAgentPrompt(corpus, site ? { site } : {})
write('prompt.json', { version: corpus.version, prompt: agentPrompt })
mkdirSync(STATIC, { recursive: true })
writeFileSync(resolve(STATIC, 'prompt.txt'), agentPrompt)

console.log(
  `dumped corpus v${corpus.version} → features(${features.length}) · cells(${cells.length}) · ` +
    `requirements(${requirements.length}) · rules(${Object.keys(RULES).length}) · ` +
    `prompt(${Math.round(agentPrompt.length / 1024)} KB)`,
)
