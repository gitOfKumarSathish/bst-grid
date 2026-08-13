import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { BstCorpus } from '../types.js'
import { ResponseFormat, fail, ok } from './shared.js'

const inputSchema = {
  symbol: z
    .string()
    .optional()
    .describe("An exported name, e.g. 'useBstTable', 'BstTableColumn', 'createClientDataSource'. Omit to list all."),
  response_format: ResponseFormat,
}

/**
 * Signatures come straight from the built `.d.ts`, so what an agent is told
 * matches what the consumer's editor will accept — no paraphrase to drift.
 */
export function registerApiTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_get_api',
    {
      title: 'Get a @bloomskill/table-engine export signature',
      description: `Get the exact TypeScript signature of a \`@bloomskill/table-engine\` export, or list all ${corpus.api.length} of them. Signatures are read from the package's built type declarations, so they match what the compiler will accept.

Use this before importing anything from Bst-Table — the package exports hooks (\`useBstTable\`), components (\`BstTable\`, \`BstFilterBuilder\`), the cell-type registry (\`createCellTypeRegistry\`, \`defineCellType\`), the DataSource layer (\`useBstDataSource\`, \`createServerDataSource\`) and its types (\`BstTableColumn\`, \`UseBstTableOptions\`).

Args:
  - symbol (string, optional): the exported name. Omit to list every export.
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "count": number, "api": [ { "symbol": string, "kind": string, "signature": string, "doc": string } ] }

Examples:
  - symbol="useBstTable" -> the hook signature and its options type
  - symbol="BstSaveEvent" -> the shape passed to onSave in batch editing
  - no args -> the export list, grouped by kind

Error handling:
  - An unknown symbol returns close matches from the export list.`,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ symbol, response_format }) => {
      if (symbol) {
        const want = symbol.trim().toLowerCase()
        const entry = corpus.api.find((a) => a.symbol.toLowerCase() === want)
        if (!entry) {
          const near = corpus.api.filter((a) => a.symbol.toLowerCase().includes(want)).slice(0, 8)
          return fail(
            `\`@bloomskill/table-engine\` does not export '${symbol}'.`,
            near.length
              ? `Close matches: ${near.map((a) => `\`${a.symbol}\``).join(', ')}.`
              : `Call \`bst_get_api()\` with no arguments for the full export list, or \`bst_search_docs({ query: "${symbol}" })\`.`,
          )
        }
        const structured = { count: 1, api: [entry] }
        if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)
        return ok(
          [
            `## \`${entry.symbol}\``,
            '',
            entry.doc ?? '',
            '',
            '```ts',
            entry.signature,
            '```',
            '',
            `Import from \`@bloomskill/table-engine\`.`,
          ].join('\n'),
          structured,
        )
      }

      const structured = {
        count: corpus.api.length,
        api: corpus.api.map((a) => ({ symbol: a.symbol, kind: a.kind })),
      }
      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      const byKind = new Map<string, string[]>()
      for (const entry of corpus.api) {
        byKind.set(entry.kind, [...(byKind.get(entry.kind) ?? []), entry.symbol])
      }
      const lines = [`# \`@bloomskill/table-engine\` exports (${corpus.api.length})`, '']
      for (const [kind, symbols] of [...byKind].sort()) {
        lines.push(`**${kind}** — ${symbols.map((s) => `\`${s}\``).join(', ')}`, '')
      }
      lines.push('_Call `bst_get_api({ symbol })` for one export\'s full signature._')
      return ok(lines.join('\n'), structured)
    },
  )
}
