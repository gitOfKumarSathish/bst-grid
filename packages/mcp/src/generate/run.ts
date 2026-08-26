/**
 * Build-time corpus generator. Runs after `tsc` (see this package's `build`
 * script) and writes `dist/corpus.json` — everything the MCP server knows.
 *
 * Extraction is from source, never hand-authored, so shipping a Bst-Table
 * feature updates the MCP server for free and the two cannot drift.
 * A published install ships the generated JSON and never runs this.
 */
import { writeFileSync } from 'node:fs'
import { CORPUS_PATH, findRepoRoot, readVersionIni } from '../constants.js'
import type { BstCorpus } from '../types.js'
import { extractApi } from './api.js'
import { extractCellTypes } from './cells.js'
import { extractRequirements } from './coverage.js'
import { docSources, extractDocs } from './docs.js'
import { extractExamples } from './examples.js'
import { extractFeatures } from './features.js'

/**
 * Concrete inputs that aren't markdown docs but still shape the corpus — the
 * authoring sources and the engine's build outputs. Joined with the doc + example
 * paths to form `corpus.sourceFiles`, which the freshness guard watches.
 */
const STRUCTURED_SOURCE_FILES = [
  'CLAUDE.md',
  'COVERAGE.md',
  'CHANGELOG.md',
  'packages/engine/src/types.ts',
  'packages/engine/dist/settings.js',
  'packages/engine/dist/index.d.ts',
]

/** Builds the corpus from a monorepo checkout. */
export async function generateCorpus(repoRoot: string): Promise<BstCorpus> {
  const [features, requirements, cellTypes, docs, api, examples] = [
    await extractFeatures(repoRoot),
    extractRequirements(repoRoot),
    extractCellTypes(repoRoot),
    extractDocs(repoRoot),
    extractApi(repoRoot),
    extractExamples(repoRoot),
  ]

  // Every concrete file the corpus was built from, for the freshness guard.
  // Computed last so it reflects the docs actually globbed and examples read.
  const sourceFiles = [
    ...STRUCTURED_SOURCE_FILES,
    ...docSources(repoRoot).map((d) => d.path),
    ...examples.flatMap((e) => e.files.map((f) => f.path)),
  ]

  return {
    version: readVersionIni(repoRoot),
    // Full ISO timestamp (not just the date) so the freshness guard can compare
    // it to source mtimes at sub-day resolution. Set here, after every extractor
    // has finished reading, so it is strictly newer than every source's mtime.
    generatedAt: new Date().toISOString(),
    sources: [
      'CLAUDE.md (§12 feature toggle registry)',
      'COVERAGE.md (58-leaf status matrix)',
      'CHANGELOG.md (per-flag "since" versions)',
      'packages/engine/dist/settings.js (BST_SETTINGS_REGISTRY)',
      'packages/engine/src/types.ts (TSDoc)',
      'packages/engine/dist/index.d.ts (API signatures)',
      'READMEs (root · examples · engine · mui · shadcn · mcp)',
      'docs/*.md (globbed — self-indexing)',
      'examples/*/src',
    ],
    sourceFiles,
    features,
    requirements,
    cellTypes,
    docs,
    api,
    examples,
  }
}

async function main(): Promise<void> {
  const repoRoot = findRepoRoot()
  if (!repoRoot) {
    throw new Error(
      'Could not locate the repo root (no version.ini found above this package). ' +
        'The corpus generator only runs inside a Bst-Table checkout.',
    )
  }

  const corpus = await generateCorpus(repoRoot)
  writeFileSync(CORPUS_PATH, JSON.stringify(corpus))

  const kb = Math.round(JSON.stringify(corpus).length / 1024)
  console.error(
    `corpus v${corpus.version} → ${CORPUS_PATH} (${kb} KB): ` +
      `${corpus.features.length} features · ${corpus.requirements.length} requirements · ` +
      `${corpus.cellTypes.length} cell types · ${corpus.docs.length} doc chunks · ` +
      `${corpus.api.length} exports · ${corpus.examples.length} examples`,
  )
}

// Only self-execute when run as the build step, so tests can import the module.
if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(`Corpus generation failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
}
