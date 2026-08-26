import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { compareSemver } from '../semver.js'
import type { VersionEntry } from '../types.js'

/**
 * Parses the released versions from `CHANGELOG.md` — every `## [x.y.z] — date`
 * heading — newest first. `## [Unreleased]` carries no version and is skipped.
 * Feeds `bst_list_versions`, so an agent can see the release history and the
 * gap between a project's version and the latest without leaving the tool.
 */
export function extractVersions(repoRoot: string): VersionEntry[] {
  const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')
  const out: VersionEntry[] = []
  for (const line of changelog.split('\n')) {
    // `## [0.43.0] — 2026-08-26` (em dash or hyphen; date optional).
    const m = line.match(/^##\s*\[(\d+\.\d+\.\d+)\]\s*(?:[—–-]\s*(\d{4}-\d{2}-\d{2}))?/)
    if (m?.[1]) out.push(m[2] ? { version: m[1], date: m[2] } : { version: m[1] })
  }
  return out.sort((a, b) => compareSemver(b.version, a.version))
}

/**
 * Builds a "first shipped in" lookup from `CHANGELOG.md`.
 *
 * Bst-Table's release discipline (CLAUDE.md §13) requires a changelog bullet
 * naming each new flag under the version that introduced it, so the **earliest**
 * released `## [x.y.z]` section that names a flag is a faithful `since` version.
 *
 * The flag must appear inside a **backtick span** (`` `enableFind` ``,
 * `` `enableEditing: { mode: 'batch' }` ``) — a leading backtick then a word
 * boundary — so ordinary prose words that happen to equal a flag name
 * (`pagination`, `disabled`) never produce a false match. A flag never named in
 * any released section (the oldest defaults that predate the changelog, like
 * `enableSorting`) returns `undefined`, which is the safe outcome: those exist in
 * every version an agent could be running, so there is nothing to warn about.
 */
export function buildShipVersionLookup(repoRoot: string): (flag: string) => string | undefined {
  const changelog = readFileSync(join(repoRoot, 'CHANGELOG.md'), 'utf8')

  // Split into released [x.y.z] sections; [Unreleased] has no version and is skipped.
  const sections: Array<{ version: string; text: string }> = []
  let current: { version: string; lines: string[] } | null = null
  const flush = (): void => {
    if (current) sections.push({ version: current.version, text: current.lines.join('\n') })
  }
  for (const line of changelog.split('\n')) {
    const heading = line.match(/^##\s*\[(\d+\.\d+\.\d+)\]/)
    if (heading?.[1]) {
      flush()
      current = { version: heading[1], lines: [] }
    } else if (current) {
      current.lines.push(line)
    }
  }
  flush()

  // Oldest first, so the first section that names a flag is its ship version.
  sections.sort((a, b) => compareSemver(a.version, b.version))

  const cache = new Map<string, string | undefined>()
  return (flag: string): string | undefined => {
    const cached = cache.get(flag)
    if (cached !== undefined || cache.has(flag)) return cached
    const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const inCode = new RegExp('`' + escaped + '\\b')
    let since: string | undefined
    for (const section of sections) {
      if (inCode.test(section.text)) {
        since = section.version
        break
      }
    }
    cache.set(flag, since)
    return since
  }
}
