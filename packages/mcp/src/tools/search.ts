import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { DEFAULT_SEARCH_LIMIT } from '../constants.js'
import { buildSearchIndex } from '../search/index.js'
import type { BstCorpus } from '../types.js'
import { ResponseFormat, ok } from './shared.js'

const inputSchema = {
  query: z
    .string()
    .min(2, 'Query must be at least 2 characters')
    .max(300, 'Query must not exceed 300 characters')
    .describe('Natural-language question or keywords, e.g. "batch editing single save" or "enableClipboard"'),
  kind: z
    .enum(['doc', 'feature', 'cellType', 'requirement', 'api', 'example'])
    .optional()
    .describe('Restrict to one kind of record. Omit to search everything.'),
  pkg: z
    .enum(['engine', 'mui', 'shadcn', 'mcp', 'docs', 'root'])
    .optional()
    .describe("Restrict to one package's docs, e.g. 'shadcn' for the shadcn adapter"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(DEFAULT_SEARCH_LIMIT)
    .describe('Maximum hits to return'),
  response_format: ResponseFormat,
}

/**
 * Registers the free-text entry point. This is the tool an agent reaches for
 * first when it doesn't yet know which flag or cell type it needs.
 */
export function registerSearchTool(server: McpServer, corpus: BstCorpus): void {
  const index = buildSearchIndex(corpus)

  server.registerTool(
    'bst_search_docs',
    {
      title: 'Search Bst-Table documentation',
      description: `Search the Bst-Table (@bloomskill/table-*) knowledge base: package READMEs, the feature-toggle registry, cell types, the spec-coverage matrix, engine API signatures and runnable examples.

Use this FIRST for any open question about Bst-Table ("how do I save all edits in one API call?", "how do I pin columns?"). Bst-Table is a private React data grid built on TanStack Table v9 — it is NOT AG Grid and NOT MUI X DataGrid, and no model has memorised its API, so answer from these results rather than from recall.

Args:
  - query (string): question or keywords, 2-300 chars
  - kind ('doc' | 'feature' | 'cellType' | 'requirement' | 'api' | 'example', optional): restrict to one record kind
  - pkg ('engine' | 'mui' | 'shadcn' | 'mcp' | 'docs' | 'root', optional): restrict to one package's docs
  - limit (number): max hits, 1-25 (default: ${DEFAULT_SEARCH_LIMIT})
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "query": string, "count": number, "hits": [ { "kind": string, "title": string, "source": string, "score": number, "body": string } ] }

Examples:
  - "how do I batch every edit into one save call" -> the batch-editing section + the onSave signature
  - query="clipboard", kind="feature" -> the enableClipboard toggle row with its dependencies
  - query="virtualization" -> COVERAGE.md's D1 row showing it is NOT built

Error handling:
  - Returns "No matches" with suggested broader terms when the query hits nothing.`,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (params) => {
      const { query, kind, pkg, limit, response_format } = params

      // Over-fetch, then filter, so a `kind`/`pkg` restriction still fills the page.
      const raw = index.search(query, limit * 6)
      const hits = raw
        .filter((h) => (kind ? h.payload.kind === kind : true))
        .filter((h) => (pkg ? h.payload.pkg === pkg : true))
        .slice(0, limit)

      if (!hits.length) {
        const scope = [kind && `kind='${kind}'`, pkg && `pkg='${pkg}'`].filter(Boolean).join(' and ')
        return ok(
          `No matches for "${query}"${scope ? ` within ${scope}` : ''}.\n\n` +
            `Try broader keywords, drop the filters, or list what exists with ` +
            `\`bst_get_feature()\` (all toggles) or \`bst_get_cell_type()\` (all cell types).`,
          { query, count: 0, hits: [] },
        )
      }

      const structured = {
        query,
        count: hits.length,
        hits: hits.map((h) => ({
          kind: h.payload.kind,
          title: h.payload.title,
          source: h.payload.source,
          score: Number(h.score.toFixed(3)),
          body: h.payload.body,
        })),
      }

      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      const text = [
        `# Bst-Table docs — "${query}"`,
        `_${hits.length} result${hits.length === 1 ? '' : 's'} · corpus v${corpus.version}_`,
        '',
        ...hits.map((h) =>
          [`## ${h.payload.title}`, `_${h.payload.kind} · ${h.payload.source}_`, '', h.payload.body, ''].join('\n'),
        ),
      ].join('\n')

      return ok(text, structured, 'Lower `limit` or add `kind`/`pkg` to narrow the search.')
    },
  )
}
