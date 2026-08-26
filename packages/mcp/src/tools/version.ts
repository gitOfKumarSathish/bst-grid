import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { BST_PACKAGES } from '../constants.js'
import type { BstCorpus } from '../types.js'
import { fail, ok } from './shared.js'

const inputSchema = {
  path: z
    .string()
    .optional()
    .describe("Absolute path to the project directory or its package.json. Defaults to the server's working directory."),
}

/** Declared shape of `structuredContent` — the same object on both the found and no-dependency paths. */
const outputSchema = {
  packageJson: z.string().describe('The package.json path actually read'),
  corpusVersion: z.string().describe('The Bst-Table version this server documents'),
  installed: z
    .array(
      z.object({
        name: z.string(),
        range: z.string().describe('The declared semver range'),
        field: z.string().describe("'dependencies' | 'devDependencies' | 'peerDependencies'"),
      }),
    )
    .describe('One entry per @bloomskill/table-* dependency found'),
  matchesCorpus: z.boolean().describe('Whether every installed range admits corpusVersion'),
  notes: z.string(),
}

/** A dependency field a Bst-Table package may be declared in. */
const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies'] as const

/**
 * Reports which Bst-Table versions a project actually has installed, and whether
 * they match the corpus. The corpus documents exactly one version; when a
 * project is on an older one, an agent needs to know that before promising a
 * feature that shipped later.
 */
export function registerVersionTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_detect_version',
    {
      title: 'Detect the installed Bst-Table version',
      description: `Read a project's package.json and report which \`@bloomskill/table-*\` packages it depends on, comparing them against this server's knowledge base (v${corpus.version}).

Run this once at the start of any Bst-Table task. This server documents v${corpus.version}; if the project is on an older version, features added later will not exist there. Pass the version it reports to \`bst_get_feature\` as \`installedVersion\` and each flag is marked ✅ available / ⚠️ NOT available in that version, using the version it shipped in.

Args:
  - path (string, optional): absolute path to the project directory or its package.json. Defaults to the server's working directory.

Returns:
  JSON with schema:
  {
    "packageJson": string,          // path actually read
    "corpusVersion": string,        // version this server documents
    "installed": [                  // one entry per @bloomskill/table-* dependency found
      { "name": string, "range": string, "field": string }
    ],
    "matchesCorpus": boolean,       // whether every range is satisfied by corpusVersion
    "notes": string
  }

Examples:
  - no args -> inspects the current working directory
  - path="/home/me/app" -> inspects /home/me/app/package.json

Error handling:
  - Returns a clear message with the path tried when no package.json is found, or when it is not valid JSON.`,
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ path }) => {
      const base = path ? (isAbsolute(path) ? path : resolve(path)) : process.cwd()
      const pkgPath = base.endsWith('package.json') ? base : join(base, 'package.json')

      if (!existsSync(pkgPath)) {
        return fail(
          `No package.json at ${pkgPath}.`,
          `Pass \`path\` as the absolute path to the project directory containing package.json.`,
        )
      }

      let pkg: Record<string, Record<string, string> | undefined>
      try {
        pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as typeof pkg
      } catch (error) {
        return fail(
          `${pkgPath} is not valid JSON: ${error instanceof Error ? error.message : String(error)}.`,
          `Fix the file, or point \`path\` at a different project.`,
        )
      }

      const installed: Array<{ name: string; range: string; field: string }> = []
      for (const field of DEP_FIELDS) {
        for (const [name, range] of Object.entries(pkg[field] ?? {})) {
          if ((BST_PACKAGES as readonly string[]).includes(name)) installed.push({ name, range, field })
        }
      }

      if (!installed.length) {
        const structured = {
          packageJson: pkgPath,
          corpusVersion: corpus.version,
          installed,
          matchesCorpus: false,
          notes: 'No @bloomskill/table-* dependency found — this project does not use Bst-Table yet.',
        }
        return ok(
          `No \`@bloomskill/table-*\` dependency in ${pkgPath}.\n\n` +
            `To add Bst-Table, install the engine plus one adapter:\n\n` +
            '```bash\n' +
            `npm install @bloomskill/table-engine@${corpus.version} @bloomskill/table-mui@${corpus.version}\n` +
            '```\n\n' +
            `Then call \`bst_scaffold_grid\` for a working starting point.`,
          structured,
        )
      }

      // Cheap, honest comparison: exact-version-in-range rather than a semver
      // implementation, so we never claim more precision than we have.
      const matchesCorpus = installed.every(({ range }) => rangeAllows(range, corpus.version))
      const installedForFeatureCheck = installed[0]?.range.replace(/^[\^~>=<\s]+/, '')
      const notes = matchesCorpus
        ? `Project matches this server's knowledge base (v${corpus.version}).`
        : `Project may be on a different version than this server documents (v${corpus.version}). ` +
          `Before using a recent feature, pass this project's version to \`bst_get_feature\` as \`installedVersion\`` +
          `${installedForFeatureCheck ? ` (e.g. \`installedVersion: "${installedForFeatureCheck}"\`)` : ''} — ` +
          `it will say plainly whether a flag exists in that version.`

      const structured = { packageJson: pkgPath, corpusVersion: corpus.version, installed, matchesCorpus, notes }
      return ok(
        [
          `# Bst-Table in ${pkgPath}`,
          '',
          '| Package | Range | Field |',
          '| --- | --- | --- |',
          ...installed.map((i) => `| \`${i.name}\` | \`${i.range}\` | ${i.field} |`),
          '',
          `**Knowledge base:** v${corpus.version} — ${matchesCorpus ? '✅ matches' : '⚠️ possible mismatch'}`,
          '',
          notes,
        ].join('\n'),
        structured,
      )
    },
  )
}

/** Compares two `[major, minor, patch]` tuples: -1 if a<b, 0 if equal, 1 if a>b. */
function cmp(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/**
 * True when a dependency range plainly admits `version`. Best-effort, not a full
 * semver implementation: it handles the forms that actually appear in a
 * package.json — exact, `*` / `latest`, `x`-ranges (`0.32.x`), caret, tilde, and
 * the comparators `>=` `>` `<=` `<`. Anything it can't parse falls back to an
 * exact match, so it stays conservative rather than guessing.
 */
export function rangeAllows(range: string, version: string): boolean {
  const cleaned = range.trim()
  if (cleaned === '' || cleaned === '*' || cleaned === 'x' || cleaned === 'latest') return true
  if (cleaned === version) return true

  const ver = version.split('.').map(Number)

  // x-ranges: `0.32.x`, `0.32.*`, `0.x` — every non-wildcard part must match.
  if (/[x*]/i.test(cleaned) && !/^[\^~]/.test(cleaned)) {
    const parts = cleaned.split('.')
    return parts.every((p, i) => /^[x*]$/i.test(p) || Number(p) === ver[i])
  }

  const bare = cleaned.replace(/^[\^~>=<\s]+/, '')
  const want = bare.split('.').map(Number)
  if (want.some(Number.isNaN)) return bare === version // unparseable → exact only

  // `^0.32.0` locks the minor for 0.x releases (npm semantics), else the major.
  if (cleaned.startsWith('^')) {
    return want[0] === 0 ? ver[0] === 0 && ver[1] === want[1] : ver[0] === want[0]
  }
  if (cleaned.startsWith('~')) return ver[0] === want[0] && ver[1] === want[1]
  if (cleaned.startsWith('>=')) return cmp(ver, want) >= 0
  if (cleaned.startsWith('>')) return cmp(ver, want) > 0
  if (cleaned.startsWith('<=')) return cmp(ver, want) <= 0
  if (cleaned.startsWith('<')) return cmp(ver, want) < 0
  return bare === version
}
