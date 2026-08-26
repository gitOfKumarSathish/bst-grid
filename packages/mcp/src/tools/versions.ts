import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { BstCorpus } from '../types.js'
import { ResponseFormat, ok } from './shared.js'

const inputSchema = {
  response_format: ResponseFormat,
}

/** Declared shape of `structuredContent`. */
const outputSchema = {
  documentedVersion: z.string().describe('The single version this server documents (its corpus)'),
  latest: z.string().optional().describe('The newest released version'),
  count: z.number(),
  versions: z.array(
    z.object({
      version: z.string(),
      date: z.string().optional().describe('Release date (YYYY-MM-DD) if the changelog carried one'),
      isDocumented: z.boolean().describe('Whether this is the version this server documents'),
    }),
  ),
}

/**
 * Lists the released Bst-Table versions so an agent can see the release history
 * and the gap between a project's version and the latest. Unlike a hosted docs
 * server, this one documents exactly ONE version (its baked-in corpus) — so this
 * tool is paired with the honest note that other versions need their own pinned
 * install. The list is generated from `CHANGELOG.md` at build time.
 */
export function registerListVersionsTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_list_versions',
    {
      title: 'List released Bst-Table versions',
      description: `List the released \`@bloomskill/table-*\` versions (from the changelog) and mark the one this server documents. Use it to see the release history, find the latest, or scope an upgrade — pair it with \`bst_detect_version\` (what a project has) and \`bst_get_feature({ installedVersion })\` (whether a flag exists in that version).

This server is offline and documents exactly ONE version — its baked-in corpus (v${corpus.version}). It does not fetch other versions' docs live; to document a different version, install that version of the server: \`npx -y @bloomskill/table-mcp@<version>\`.

Args:
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "documentedVersion": string, "latest": string, "count": number, "versions": [ { "version": string, "date": string, "isDocumented": boolean } ] }

Examples:
  - (no args) -> every released version, newest first, with the documented one marked

Error handling:
  - Always succeeds; the version list ships inside the corpus.`,
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ response_format }) => {
      const versions = corpus.versions.map((v) => ({
        ...v,
        isDocumented: v.version === corpus.version,
      }))
      const structured = {
        documentedVersion: corpus.version,
        ...(versions[0] ? { latest: versions[0].version } : {}),
        count: versions.length,
        versions,
      }

      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      const latest = versions[0]?.version
      const lines = [
        `# Bst-Table released versions (${versions.length})`,
        '',
        `This server documents **v${corpus.version}**${latest && latest !== corpus.version ? ` — the latest release is **v${latest}**` : ' (the latest)'}.`,
        '',
        '| Version | Date | |',
        '| --- | --- | --- |',
        ...versions.map(
          (v) => `| \`${v.version}\` | ${v.date ?? '—'} | ${v.isDocumented ? '📖 documented here' : ''} |`,
        ),
        '',
        `_One version per corpus. For another version's docs, run \`npx -y @bloomskill/table-mcp@<version>\`. ` +
          `To check whether a feature exists in a project's version, use \`bst_get_feature({ flag, installedVersion })\`._`,
      ]
      return ok(lines.join('\n'), structured)
    },
  )
}
