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

Run this once at the start of any Bst-Table task. This server documents v${corpus.version}; if the project is on an older version, features added later will not exist there, and \`bst_get_feature\` status notes ("✅ done (v0.30.0)") tell you which.

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
      const notes = matchesCorpus
        ? `Project matches this server's knowledge base (v${corpus.version}).`
        : `Project may be on a different version than this server documents (v${corpus.version}). Feature status notes in \`bst_get_feature\` cite the version each feature shipped in — check them before using a recent feature.`

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

/** True when a dependency range plainly admits `version` (exact, `^`, `~`, `*`, or `latest`). */
function rangeAllows(range: string, version: string): boolean {
  const cleaned = range.trim()
  if (cleaned === '*' || cleaned === 'latest' || cleaned === '') return true
  if (cleaned === version) return true
  const bare = cleaned.replace(/^[\^~>=<\s]+/, '')
  const [major, minor] = version.split('.')
  const [wantMajor, wantMinor] = bare.split('.')
  if (cleaned.startsWith('^')) return wantMajor === major
  if (cleaned.startsWith('~')) return wantMajor === major && wantMinor === minor
  return bare === version
}
