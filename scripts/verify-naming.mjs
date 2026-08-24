#!/usr/bin/env node
/**
 * Neutral-naming guard.
 *
 * Bst-Table documents its own capabilities in its own words. Third-party grid
 * product names must not appear anywhere — not in docs, not in code comments,
 * not in the strings we ship to end users or to AI agents via MCP, and **not in
 * the compiled output we publish to npm**. Roadmap IDs are the `X1–X29` scheme
 * in COVERAGE.md.
 *
 * Two scopes, because they catch different things:
 *   1. SOURCE  — tracked + new-but-unignored files (what a reviewer reads).
 *   2. PAYLOAD — every packages/<pkg>/{dist,styles} file (what npm publishes).
 *      This is the scope that matters most: `tsc` does not delete stale outputs,
 *      so a deleted source can leave a compiled orphan behind in dist and ship
 *      for months. That is a real bug this guard has already caught once.
 *
 * Run: npm run verify:naming   (wired into the release flow, CLAUDE.md §13)
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Terms that must never appear. Matched case-insensitively where noted. */
const BANNED = [
  { re: /ag[^a-z0-9]{0,3}grid/i, why: 'third-party grid product name' },
  { re: /\bAG\d{1,2}\b/, why: 'retired roadmap ID scheme — use X1–X29' },
  { re: /\bAG tier\b/i, why: 'third-party licensing tier column' },
  { re: /mui[ -]?x[ -]?data[ -]?grid/i, why: 'third-party grid product name' },
]

/** Paths exempt from the scan (binary, vendored, or lockfile noise). */
const SKIP = [/^package-lock\.json$/, /^\.packed\//, /\.(png|jpe?g|gif|svg|ico|tgz|zip|pdf|woff2?|map)$/i]

/** Every file under a directory, recursively. */
function walk(dir, out = []) {
  if (!existsSync(dir)) return out
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

/** 1. Source scope: tracked files plus new, non-ignored ones. */
const source = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)

/** 2. Payload scope: the built artifacts each package publishes (`files: [dist, styles]`). */
const payload = []
for (const pkg of readdirSync('packages')) {
  payload.push(...walk(join('packages', pkg, 'dist')), ...walk(join('packages', pkg, 'styles')))
}

const files = [...new Set([...source, ...payload])].filter((f) => !SKIP.some((s) => s.test(f)))

const hits = []
for (const file of files) {
  let text
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    continue // unreadable / binary
  }
  text.split('\n').forEach((line, i) => {
    for (const { re, why } of BANNED) {
      if (re.test(line)) hits.push(`${file}:${i + 1}  [${why}]  ${line.trim().slice(0, 120)}`)
    }
  })
}

if (hits.length) {
  console.error(`\n✖ verify:naming — ${hits.length} banned reference(s):\n`)
  for (const h of hits) console.error('  ' + h)
  console.error(
    '\nBst-Table describes its own capabilities in its own words. See docs/capability-roadmap.md.' +
      '\nA hit under packages/*/dist with no matching src file is a STALE BUILD ARTIFACT — rebuild (builds now clean dist first).\n',
  )
  process.exit(1)
}
console.log(`✔ verify:naming — ${files.length} files clean (${source.length} source · ${payload.length} published artifacts)`)
