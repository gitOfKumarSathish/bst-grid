import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { SCAFFOLD_FEATURES, scaffoldGrid } from '../scaffold.js'
import type { BstCorpus } from '../types.js'
import { validateConfig } from '../validate.js'
import { ResponseFormat, ValidationReportSchema, ok } from './shared.js'

const inputSchema = {
  adapter: z
    .enum(['mui', 'shadcn', 'engine'])
    .describe("Which skin: 'mui' (Material UI), 'shadcn' (Radix/shadcn), or 'engine' (headless, no chrome)"),
  features: z
    .array(z.enum(SCAFFOLD_FEATURES))
    .default([])
    .describe('Capabilities to enable. Dependencies are added automatically.'),
  columns: z
    .array(
      z.object({
        id: z.string().min(1).describe('Field name on the row object'),
        header: z.string().optional().describe('Column header text; defaults to a capitalised id'),
        type: z.string().optional().describe("A `meta.type` cell type, e.g. 'number', 'singleSelect', 'sparkline'"),
        editable: z.boolean().optional().describe('Whether this column can be edited'),
      }),
    )
    .min(1, 'At least one column is required')
    .describe('The columns to generate'),
  rowTypeName: z.string().optional().describe("Name for the generated row interface (default: 'Row')"),
  response_format: ResponseFormat,
}

/**
 * Declared shape of `structuredContent`: the generated component plus the
 * validator's verdict on it, so a client sees the same self-check the tool ran.
 */
const outputSchema = {
  code: z.string().describe('The generated .tsx component source'),
  install: z.string().describe('The install command for the packages it imports'),
  notes: z.array(z.string()).describe('Capability notes worth surfacing alongside the code'),
  validation: ValidationReportSchema.describe('The validator run against the generated code'),
}

/**
 * Emits a complete, dependency-correct grid. The output is run back through the
 * validator before returning, so the tool can never hand out a configuration
 * that its sibling tool would reject.
 */
export function registerScaffoldTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_scaffold_grid',
    {
      title: 'Scaffold a Bst-Table grid',
      description: `Generate a complete, compiling Bst-Table component — imports, row type, typed column definitions, CSS import and every flag the requested capabilities depend on.

Prefer this over writing a grid from memory. It resolves the dependencies that are easy to miss: \`clipboard\` also emits \`enableCellSelection\`, \`editing\` also emits \`getRowId\` + \`onDataChange\`, \`batchEditing\` also emits an \`onSave\` handler that makes exactly one request. The result is validated before it is returned.

Args:
  - adapter ('mui' | 'shadcn' | 'engine'): which skin. 'engine' is headless (no toolbar/menus).
  - features (string[]): any of ${SCAFFOLD_FEATURES.join(', ')}
  - columns (array): [{ id, header?, type?, editable? }] — \`type\` is a \`meta.type\` cell type
  - rowTypeName (string, optional): name for the generated row interface (default: 'Row')
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "code": string, "install": string, "notes": string[], "validation": { "ok": boolean, "findings": [...] } }

Examples:
  - adapter="mui", features=["sorting","pagination","globalSearch"], columns=[{id:"name"},{id:"age",type:"number"}]
  - adapter="shadcn", features=["batchEditing","clipboard"], columns=[{id:"name",editable:true}] -> batch drafts + one onSave call
  - adapter="engine", features=["serverMode"], columns=[{id:"name"}] -> a DataSource-backed grid

Error handling:
  - An unknown cell type still generates, with the column typed as string; call \`bst_get_cell_type()\` for valid types.`,
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ adapter, features, columns, rowTypeName, response_format }) => {
      const result = scaffoldGrid(corpus, {
        adapter,
        features,
        columns,
        ...(rowTypeName ? { rowTypeName } : {}),
      })

      // Self-check: never emit a config our own validator would reject.
      const validation = validateConfig(corpus, result.code)

      const unknownTypes = columns
        .map((c) => c.type)
        .filter((t): t is string => Boolean(t) && !corpus.cellTypes.some((ct) => ct.type === t))

      const structured = { ...result, validation }
      if (response_format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

      const lines = [
        `# Bst-Table grid (${adapter} skin) — v${corpus.version}`,
        '',
        '```bash',
        result.install,
        '```',
        '',
        '```tsx',
        result.code,
        '```',
        '',
      ]

      if (unknownTypes.length) {
        lines.push(
          `> ⚠️ Unknown cell type${unknownTypes.length === 1 ? '' : 's'}: ${unknownTypes.map((t) => `\`${t}\``).join(', ')}. ` +
            `Valid values: ${corpus.cellTypes.map((c) => c.type).join(', ')}.`,
          '',
        )
      }

      if (result.notes.length) {
        lines.push('## Notes', '', ...result.notes.map((n) => `- ${n}`), '')
      }

      const problems = validation.findings.filter((f) => f.level !== 'info')
      lines.push(
        '## Validation',
        '',
        problems.length
          ? problems.map((f) => `- **${f.level}** \`${f.subject}\` — ${f.message} _${f.fix}_`).join('\n')
          : '✅ No unmet dependencies — every flag above has what it needs.',
      )

      return ok(lines.join('\n'), structured, 'Request fewer features or columns.')
    },
  )
}
