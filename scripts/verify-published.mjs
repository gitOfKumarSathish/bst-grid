#!/usr/bin/env node
/**
 * Registry-side naming audit.
 *
 * `verify:naming` covers the working tree and the payload we are ABOUT to
 * publish. This one closes the last gap: it downloads every version already on
 * the npm registry and scans its tarball with the same banned-term list, so we
 * know precisely which published versions still carry a trace — and therefore
 * exactly which ranges to `npm deprecate`.
 *
 * Read-only. Needs network. Nothing here mutates the registry.
 *
 * Run: npm run verify:published            (all four packages, all versions)
 *      Not wired into CI — it needs network and the registry is not our build.
 *      npm run verify:published -- --json  (machine-readable summary)
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Kept in sync with scripts/verify-naming.mjs. */
const BANNED = [
  { re: /ag[^a-z0-9]{0,3}grid/i, why: 'third-party grid product name' },
  { re: /\bAG\d{1,2}\b/, why: 'retired roadmap ID scheme' },
  { re: /mui[ -]?x[ -]?data[ -]?grid/i, why: 'third-party grid product name' },
]

const PACKAGES = [
  '@bloomskill/table-engine',
  '@bloomskill/table-mui',
  '@bloomskill/table-shadcn',
  '@bloomskill/table-mcp',
]

const asJson = process.argv.includes('--json')
const log = (...a) => !asJson && console.log(...a)

/** Every published version of a package, oldest first. */
function versionsOf(pkg) {
  const out = execFileSync('npm', ['view', pkg, 'versions', '--json'], { encoding: 'utf8' })
  const parsed = JSON.parse(out)
  return Array.isArray(parsed) ? parsed : [parsed]
}

/** Download one version's tarball and return its banned-term hits. */
function scan(pkg, version, dir) {
  execFileSync('npm', ['pack', `${pkg}@${version}`, '--silent', '--pack-destination', dir], {
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  const tgz = readdirSync(dir).find((f) => f.endsWith('.tgz'))
  const text = execFileSync('tar', ['-xzOf', join(dir, tgz)], {
    encoding: 'latin1',
    maxBuffer: 256 * 1024 * 1024,
  })
  rmSync(join(dir, tgz), { force: true })

  const found = new Map()
  for (const line of text.split('\n')) {
    for (const { re, why } of BANNED) {
      const m = line.match(re)
      if (m) found.set(m[0], why)
    }
  }
  return [...found].map(([term, why]) => ({ term, why }))
}

const report = []
const dir = mkdtempSync(join(tmpdir(), 'bst-published-'))
try {
  for (const pkg of PACKAGES) {
    log(`\n${pkg}`)
    for (const version of versionsOf(pkg)) {
      let hits
      try {
        hits = scan(pkg, version, dir)
      } catch (err) {
        log(`  ${version.padEnd(9)} ⚠️  could not fetch (${String(err.message).split('\n')[0]})`)
        continue
      }
      report.push({ pkg, version, hits })
      const label = hits.length ? `✖ ${hits.map((h) => h.term).join(', ')}` : '✔ clean'
      log(`  ${version.padEnd(9)} ${label}`)
    }
  }
} finally {
  rmSync(dir, { recursive: true, force: true })
}

const dirty = report.filter((r) => r.hits.length)
if (asJson) {
  console.log(JSON.stringify({ scanned: report.length, dirty }, null, 2))
} else if (dirty.length) {
  console.log(`\n${dirty.length} of ${report.length} published versions carry a trace.`)
  console.log('Candidates for `npm deprecate` once consumers have migrated:')
  for (const pkg of PACKAGES) {
    const vs = dirty.filter((d) => d.pkg === pkg).map((d) => d.version)
    if (vs.length) console.log(`  ${pkg}: ${vs.join(', ')}`)
  }
} else {
  console.log(`\n✔ all ${report.length} published versions clean`)
}
