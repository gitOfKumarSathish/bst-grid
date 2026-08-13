import { statSync } from 'node:fs'
import { join } from 'node:path'
import type { BstCorpus } from '../types.js'

/** A source file that changed after the corpus was built. */
export interface StaleSource {
  /** Repo-relative path. */
  path: string
  /** The file's mtime (ISO), which is newer than the corpus. */
  mtime: string
}

/**
 * Finds indexed sources whose mtime is **newer** than the corpus's `generatedAt`
 * — i.e. edited since the last build, so the corpus no longer reflects them.
 *
 * This is the prose counterpart of the toggle/rule parity guards: those fail the
 * gate when a feature is undocumented, this fails it when a documented source has
 * drifted from the built corpus. It runs in the test layer (after the build, like
 * the other guards), because the generator itself always regenerates and so can
 * never observe its own staleness.
 *
 * mtime-based, so it's meaningful within a working tree (edit a doc, forget to
 * rebuild → caught) rather than across `git clone`s, which don't preserve mtimes
 * — but since the corpus is git-ignored and always freshly built, that's exactly
 * when the check matters.
 */
export function findStaleSources(corpus: BstCorpus, repoRoot: string): StaleSource[] {
  const generatedAtMs = new Date(corpus.generatedAt).getTime()
  if (Number.isNaN(generatedAtMs)) {
    throw new Error(`corpus.generatedAt is not a valid timestamp: "${corpus.generatedAt}"`)
  }

  const stale: StaleSource[] = []
  for (const rel of corpus.sourceFiles) {
    let mtimeMs: number
    try {
      mtimeMs = statSync(join(repoRoot, rel)).mtimeMs
    } catch {
      // A source that has since been removed isn't "newer"; the extractors' own
      // "not found" errors cover deletion of a required source.
      continue
    }
    if (mtimeMs > generatedAtMs) stale.push({ path: rel, mtime: new Date(mtimeMs).toISOString() })
  }
  return stale
}
