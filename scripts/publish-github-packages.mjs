#!/usr/bin/env node
/**
 * Mirror the @bloomskill/table-* release to GitHub Packages (npm.pkg.github.com)
 * so the four packages appear under the repository's "Packages" section.
 *
 * Two GitHub rules shape everything this script does:
 *
 *   1. **The npm scope must equal the account that owns the repository.**
 *      `@bloomskill/table-engine` cannot be published under a repo owned by
 *      `gitOfKumarSathish`, so the mirror republishes the same tarball as
 *      `@gitofkumarsathish/table-engine` (scopes are lowercased). npmjs.com
 *      keeps the real `@bloomskill/*` names — those are unaffected.
 *
 *   2. **Even a *public* GitHub Packages npm package needs a token to install.**
 *      Unlike the container registry, npm.pkg.github.com has no anonymous read.
 *      So this is a visibility mirror; npmjs.com stays the distribution channel.
 *
 * The adapters' internal `@bloomskill/table-engine` dependency is deliberately
 * NOT rewritten to the mirror scope: the compiled `dist/` imports that exact
 * specifier, so renaming it in the manifest alone would ship an adapter whose
 * declared peer never matches what its own code imports. The mirror adapters
 * therefore peer-depend on the engine as published to npmjs.com.
 *
 * Each package.json is edited in place, published, then restored — the working
 * tree is left byte-identical, including on failure.
 *
 * Usage:
 *   node scripts/publish-github-packages.mjs [--dry] [--owner <account>]
 *
 * Owner resolution: --owner, else $GITHUB_REPOSITORY_OWNER (set by Actions),
 * else parsed from the engine's `repository.url`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = 'https://npm.pkg.github.com'
// Engine first: the adapters peer-depend on it, so it should exist first.
const PKGS = ['engine', 'mui', 'shadcn', 'mcp']

const argv = process.argv.slice(2)
const dry = argv.includes('--dry')
const ownerArg = argv[argv.indexOf('--owner') + 1]

const manifestPath = (p) => join(ROOT, 'packages', p, 'package.json')

/** The account that owns this repo — GitHub requires the scope to match it. */
function resolveOwner() {
  if (argv.includes('--owner') && ownerArg && !ownerArg.startsWith('--')) return ownerArg
  if (process.env.GITHUB_REPOSITORY_OWNER) return process.env.GITHUB_REPOSITORY_OWNER
  const url = JSON.parse(readFileSync(manifestPath('engine'), 'utf8')).repository?.url ?? ''
  const m = url.match(/github\.com[/:]([^/]+)\//)
  if (!m) {
    console.error('Could not determine the repository owner. Pass --owner <account>.')
    process.exit(1)
  }
  return m[1]
}

// GitHub normalises scopes to lowercase; publishing with mixed case 404s.
const owner = resolveOwner().toLowerCase()
const repoSlug =
  process.env.GITHUB_REPOSITORY ??
  (JSON.parse(readFileSync(manifestPath('engine'), 'utf8')).repository?.url ?? '').match(
    /github\.com[/:]([^/]+\/[^/.]+)/,
  )?.[1]

console.log(`Mirroring to ${REGISTRY} under @${owner}${dry ? '   [dry-run, nothing published]' : ''}\n`)

// `dist/` is the whole payload and is not committed. Without it npm still
// publishes happily — a package that looks right in the UI and imports as
// undefined. Refuse rather than mirror an empty tarball.
const unbuilt = PKGS.filter((p) => !existsSync(join(ROOT, 'packages', p, 'dist')))
if (unbuilt.length) {
  console.error(`Not built: ${unbuilt.join(', ')}. Run "npm run build" first.`)
  process.exit(1)
}

/** Original manifest text, so every edit is undone even if a publish throws. */
const originals = new Map()
let failed = 0

try {
  for (const p of PKGS) {
    const file = manifestPath(p)
    const original = readFileSync(file, 'utf8')
    originals.set(file, original)

    const json = JSON.parse(original)
    const published = json.name // @bloomskill/table-engine
    const mirrored = `@${owner}/${published.split('/')[1]}`

    json.name = mirrored
    json.publishConfig = { ...json.publishConfig, access: 'public', registry: REGISTRY }
    writeFileSync(file, JSON.stringify(json, null, 2) + '\n')

    console.log(`${published} -> ${mirrored}@${json.version}`)
    if (dry) continue

    try {
      execFileSync('npm', ['publish', '--registry', REGISTRY], {
        cwd: join(ROOT, 'packages', p),
        stdio: 'pipe',
        encoding: 'utf8',
      })
      console.log(`  ✓ published`)
    } catch (err) {
      const out = `${err.stdout ?? ''}${err.stderr ?? ''}`
      // Re-running after a partial failure is normal; an already-published
      // version is not an error worth failing the whole mirror over.
      if (/409|already exists|cannot publish over/i.test(out)) {
        console.log(`  – skipped (${mirrored}@${json.version} is already published)`)
      } else {
        failed++
        // npm's success chatter goes to stderr too; keep just the diagnosis.
        const errors = out.split('\n').filter((l) => /npm (error|ERR!)/.test(l))
        console.error(`  ✗ failed\n${(errors.length ? errors.join('\n') : out).trim().replace(/^/gm, '    ')}`)
      }
    }
  }
} finally {
  for (const [file, text] of originals) writeFileSync(file, text)
}

if (failed) {
  console.error(`\n${failed} package(s) failed to publish.`)
  process.exit(1)
}
console.log(
  dry
    ? '\nDry run complete — no package.json was left modified.'
    : `\nDone. The packages appear at https://github.com/${repoSlug}/packages`,
)
