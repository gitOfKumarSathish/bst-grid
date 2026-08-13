import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** MCP server identity (skill convention: `{service}-mcp-server`). */
export const SERVER_NAME = 'bst-table-mcp-server'

/**
 * Cap on a single tool response, so a broad query can never blow out the
 * client's context. Tools truncate and say so rather than silently cutting.
 */
export const CHARACTER_LIMIT = 25_000

/** Default number of hits `bst_search_docs` returns. */
export const DEFAULT_SEARCH_LIMIT = 8

/** The three published packages this server documents. */
export const BST_PACKAGES = [
  '@bloomskill/table-engine',
  '@bloomskill/table-mui',
  '@bloomskill/table-shadcn',
] as const

const HERE = dirname(fileURLToPath(import.meta.url))

/**
 * The monorepo root, found by walking up for `version.ini` (the single source of
 * truth for the version). Only available when running from a source checkout —
 * a published install has no repo, which is why the corpus is baked into `dist/`.
 * Returns `undefined` outside a checkout.
 */
export function findRepoRoot(from: string = HERE): string | undefined {
  let dir = resolve(from)
  for (;;) {
    if (existsSync(join(dir, 'version.ini'))) return dir
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

/** Path to the generated corpus. Written by `src/generate/run.ts` at build time. */
export const CORPUS_PATH = join(HERE, 'corpus.json')

/** Reads `version.ini`'s `version = X.Y.Z`. Build-time only (needs the repo). */
export function readVersionIni(repoRoot: string): string {
  const ini = readFileSync(join(repoRoot, 'version.ini'), 'utf8')
  const m = ini.match(/version\s*=\s*(\d+\.\d+\.\d+)/)
  if (!m?.[1]) throw new Error(`Could not read "version = X.Y.Z" from ${repoRoot}/version.ini`)
  return m[1]
}
