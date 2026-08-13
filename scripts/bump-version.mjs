// Bump the @bloomskill/table-* versions from version.ini (single source of truth).
// Usage: node scripts/bump-version.mjs <patch|minor|major> [--dry]
// Keeps all 4 packages in lockstep and updates the adapters' internal
// @bloomskill/table-engine ranges to match the new version.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const INI = join(ROOT, 'version.ini')
const PKGS = ['engine', 'mui', 'shadcn', 'mcp']
const ENGINE_DEP = '@bloomskill/table-engine'

const level = (process.argv[2] || 'patch').toLowerCase()
const dry = process.argv.includes('--dry')
if (!['patch', 'minor', 'major'].includes(level)) {
  console.error('Usage: node scripts/bump-version.mjs <patch|minor|major> [--dry]')
  process.exit(1)
}

const ini = readFileSync(INI, 'utf8')
const m = ini.match(/version\s*=\s*(\d+)\.(\d+)\.(\d+)/)
if (!m) {
  console.error('Could not find "version = X.Y.Z" in version.ini')
  process.exit(1)
}
let [maj, min, pat] = [Number(m[1]), Number(m[2]), Number(m[3])]
const current = `${maj}.${min}.${pat}`
if (level === 'major') { maj++; min = 0; pat = 0 }
else if (level === 'minor') { min++; pat = 0 }
else { pat++ }
const next = `${maj}.${min}.${pat}`

console.log(`bloomskill-table: ${current} -> ${next}  (${level})${dry ? '   [dry-run, no files written]' : ''}`)
if (dry) process.exit(0)

// 1) version.ini
writeFileSync(INI, ini.replace(/version\s*=\s*\d+\.\d+\.\d+/, `version = ${next}`))

// 2) each package.json: version + internal engine ranges (adapters only).
// The MCP server rides the same version: its corpus documents exactly the
// release it ships with, so a drifting version would misreport the API.
for (const p of PKGS) {
  const f = join(ROOT, 'packages', p, 'package.json')
  const j = JSON.parse(readFileSync(f, 'utf8'))
  j.version = next
  for (const field of ['dependencies', 'peerDependencies', 'devDependencies']) {
    if (j[field] && j[field][ENGINE_DEP]) j[field][ENGINE_DEP] = `^${next}`
  }
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n')
  console.log(`  ${j.name} -> ${next}`)
}

console.log(`\nNext:
  1. add a "[${next}]" entry to CHANGELOG.md + update README(s) per CLAUDE.md §13
  2. npm run release        # build + publish all four (engine first)`)
