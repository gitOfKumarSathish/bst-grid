import { existsSync, readFileSync } from 'node:fs'
import { CORPUS_PATH } from './constants.js'
import type { BstCorpus, CellTypeEntry, FeatureEntry, RequirementEntry } from './types.js'

let cached: BstCorpus | undefined

/**
 * Loads the generated knowledge base (`dist/corpus.json`), once per process.
 * Missing means the package was built without its generate step — surface that
 * plainly rather than serving an empty server that silently knows nothing.
 */
export function loadCorpus(): BstCorpus {
  if (cached) return cached
  if (!existsSync(CORPUS_PATH)) {
    throw new Error(
      `Bst-Table MCP corpus not found at ${CORPUS_PATH}.\n` +
        `The package was built without its generate step. From the repo root run:\n` +
        `  npm run build -w @bloomskill/table-engine && npm run build -w @bloomskill/table-mcp`,
    )
  }
  cached = JSON.parse(readFileSync(CORPUS_PATH, 'utf8')) as BstCorpus
  return cached
}

/** Test seam — inject a corpus instead of reading from disk. */
export function setCorpus(corpus: BstCorpus | undefined): void {
  cached = corpus
}

// ---- lookups shared by the tools (kept here so no tool re-implements them) ----

/** Case-insensitive exact flag lookup. */
export function findFeature(corpus: BstCorpus, flag: string): FeatureEntry | undefined {
  const want = flag.trim().toLowerCase()
  return corpus.features.find((f) => f.flag.toLowerCase() === want)
}

/** Fuzzy flag lookup — for suggesting alternatives when an exact match fails. */
export function suggestFeatures(corpus: BstCorpus, flag: string, limit = 5): FeatureEntry[] {
  const want = flag.trim().toLowerCase().replace(/^(enable|show)/, '')
  if (!want) return []
  return corpus.features
    .filter((f) => f.flag.toLowerCase().includes(want) || f.feature.toLowerCase().includes(want))
    .slice(0, limit)
}

/** Requirement leaf lookup by id (`D1`, case-insensitive). */
export function findRequirement(corpus: BstCorpus, id: string): RequirementEntry | undefined {
  const want = id.trim().toUpperCase()
  return corpus.requirements.find((r) => r.id.toUpperCase() === want)
}

/** Cell-type lookup by `meta.type` (case-insensitive). */
export function findCellType(corpus: BstCorpus, type: string): CellTypeEntry | undefined {
  const want = type.trim().toLowerCase()
  return corpus.cellTypes.find((c) => c.type.toLowerCase() === want)
}

/**
 * Truncates a response to `limit` characters, appending an explanation of how to
 * get the rest. Shared by every tool so the cut always reads the same way.
 */
export function truncate(text: string, limit: number, hint: string): string {
  if (text.length <= limit) return text
  const kept = text.slice(0, limit)
  return `${kept}\n\n---\n**Response truncated** at ${limit.toLocaleString()} characters (full length ${text.length.toLocaleString()}). ${hint}`
}
