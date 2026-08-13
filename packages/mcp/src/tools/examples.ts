import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { BstCorpus } from '../types.js'
import { ResponseFormat, fail, ok } from './shared.js'

const inputSchema = {
  name: z
    .string()
    .optional()
    .describe("An example's directory name, e.g. 'quick-start', 'editing'. Omit to list all."),
  response_format: ResponseFormat,
}

/**
 * The examples are complete, compiling apps that import the published packages
 * exactly as a consumer's project would — the strongest grounding available for
 * "write me a grid that…", because the agent copies working code instead of
 * assembling it from prose.
 */
export function registerExampleTool(server: McpServer, corpus: BstCorpus): void {
  const names = corpus.examples.map((e) => e.name).join(', ')

  server.registerTool(
    'bst_get_example',
    {
      title: 'Get a runnable Bst-Table example',
      description: `Get the complete source of one of the ${corpus.examples.length} runnable Bst-Table examples, or list them.

Each is a self-contained Vite + React + TS app importing the published \`@bloomskill/table-*\` packages exactly as a consumer would. Prefer adapting an example over composing a grid from scratch — the imports, column typing and CSS wiring are already correct. Available: ${names}.

Args:
  - name (string, optional): the example directory name. Omit to list all.
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "count": number, "examples": [ { "name": string, "description": string, "files": [ { "path": string, "code": string } ] } ] }

Examples:
  - name="quick-start" -> the minimal sortable + paginated grid
  - name="editing" -> inline editing, validation, cell types, row actions
  - no args -> the catalogue with one-line descriptions

Error handling:
  - An unknown name lists the valid ones.`,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ name, response_format }) => {
      if (name) {
        const want = name.trim().toLowerCase()
        const example = corpus.examples.find((e) => e.name.toLowerCase() === want)
        if (!example) return fail(`No example named '${name}'.`, `Available examples: ${names}.`)

        const structured = { count: 1, examples: [example] }
        if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)
        return ok(
          [
            `# Example: \`${example.name}\``,
            '',
            example.description,
            '',
            ...example.files.flatMap((f) => [
              `## \`${f.path}\``,
              '',
              `\`\`\`${f.path.endsWith('.css') ? 'css' : 'tsx'}`,
              f.code,
              '```',
              '',
            ]),
          ].join('\n'),
          structured,
          `This example is large — request a single file's content by reading \`${example.files[0]?.path}\` from the repo instead.`,
        )
      }

      const structured = {
        count: corpus.examples.length,
        examples: corpus.examples.map((e) => ({
          name: e.name,
          description: e.description,
          files: e.files.map((f) => f.path),
        })),
      }
      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      return ok(
        [
          `# Bst-Table runnable examples (${corpus.examples.length})`,
          '',
          '| Example | Shows |',
          '| --- | --- |',
          ...corpus.examples.map((e) => `| \`${e.name}\` | ${e.description} |`),
          '',
          '_Call `bst_get_example({ name })` for the full source._',
        ].join('\n'),
        structured,
      )
    },
  )
}
