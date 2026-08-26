import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { findCellType } from '../corpus.js'
import type { BstCorpus } from '../types.js'
import { ResponseFormat, fail, ok } from './shared.js'

const inputSchema = {
  type: z
    .string()
    .optional()
    .describe("A `meta.type` value, e.g. 'singleSelect', 'sparkline', 'richText'. Omit to list all."),
  response_format: ResponseFormat,
}

/** Declared shape of `structuredContent`; `.passthrough()` keeps `cellMetaDetail`. */
const outputSchema = {
  count: z.number().describe('Number of cell types returned (1 for a single lookup)'),
  cellTypes: z.array(
    z
      .object({
        type: z.string().describe('The `meta.type` value'),
        renders: z.string(),
        valueShape: z.string().describe('Expected cell value type'),
        editable: z.string(),
        cellMeta: z.string(),
      })
      .passthrough(),
  ),
}

/**
 * Cell types are where generated column definitions most often go wrong: the
 * renderer is picked by a string (`meta.type`) and each type expects a specific
 * value shape. Getting both exactly right is the difference between a column
 * that renders and one that throws.
 */
export function registerCellTypeTool(server: McpServer, corpus: BstCorpus): void {
  const names = corpus.cellTypes.map((c) => c.type).join(', ')

  server.registerTool(
    'bst_get_cell_type',
    {
      title: 'Get a Bst-Table cell type',
      description: `Look up a Bst-Table cell renderer/editor by its \`meta.type\`, or list all ${corpus.cellTypes.length}.

A column picks its renderer and editor with \`meta.type\` in its column definition:
  { id: 'status', accessorKey: 'status', header: 'Status', meta: { type: 'singleSelect', options: [...] } }

Read renderers are dependency-free and run on the hot path; the MUI and shadcn adapters supply richer editors for the same types via their presets. Available: ${names}.

Args:
  - type (string, optional): the \`meta.type\` value. Omit to list every type.
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "count": number, "cellTypes": [ { "type": string, "renders": string, "valueShape": string, "editable": string, "cellMeta": string, "cellMetaDetail": string } ] }

Examples:
  - type="multiSelect" -> value is string[], chips + "+N more" overflow, cellMeta maxChips / fitChips
  - type="kpi" -> value is number or { value, delta?, data? }, read-only
  - no args -> the full catalogue for choosing a type

Error handling:
  - An unknown type lists the valid ones instead of guessing.`,
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ type, response_format }) => {
      if (type) {
        const cell = findCellType(corpus, type)
        if (!cell) {
          return fail(
            `No cell type '${type}'.`,
            `Valid \`meta.type\` values are: ${names}. To add your own, use \`createCellTypeRegistry\` + \`defineCellType\` and pass the result as the \`cellTypes\` option.`,
          )
        }
        const structured = { count: 1, cellTypes: [cell] }
        if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)
        return ok(
          [
            `## \`meta.type: '${cell.type}'\``,
            '',
            `| | |`,
            `| --- | --- |`,
            `| **Renders** | ${cell.renders} |`,
            `| **Value shape** | \`${cell.valueShape}\` |`,
            `| **Editable** | ${cell.editable} |`,
            `| **Notable \`cellMeta\`** | ${cell.cellMeta || '—'} |`,
            '',
            cell.cellMetaDetail ?? '',
          ].join('\n'),
          structured,
        )
      }

      const structured = { count: corpus.cellTypes.length, cellTypes: corpus.cellTypes }
      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      const lines = [
        `# Bst-Table cell types (${corpus.cellTypes.length}) — corpus v${corpus.version}`,
        '',
        'Set with `meta.type` on a column definition.',
        '',
        '| `meta.type` | Renders | Value shape | Editable | Notable `cellMeta` |',
        '| --- | --- | --- | --- | --- |',
        ...corpus.cellTypes.map(
          (c) => `| \`${c.type}\` | ${c.renders} | \`${c.valueShape}\` | ${c.editable} | ${c.cellMeta || '—'} |`,
        ),
        '',
        '_Call `bst_get_cell_type({ type })` for one type\'s full `cellMeta` reference._',
      ]
      return ok(lines.join('\n'), structured)
    },
  )
}
