import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { BstCorpus } from '../types.js'
import { validateConfig } from '../validate.js'
import { ResponseFormat, fail, ok } from './shared.js'

const inputSchema = {
  code: z
    .string()
    .max(20_000)
    .optional()
    .describe('The JSX/TSX or options object to check, e.g. a `<BstTableMui ... />` element or a `useBstTable({...})` call'),
  config: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('An already-parsed props object, as an alternative to `code`'),
  response_format: ResponseFormat,
}

/**
 * The highest-value tool in the server. Bst-Table has two flag layers with
 * cross-dependencies (chrome needs behaviour, clipboard implies selection,
 * editing needs `getRowId`), so a plausible-looking config is very often a
 * silently dead one. Checking beats guessing.
 */
export function registerValidateTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_validate_config',
    {
      title: 'Validate a Bst-Table configuration',
      description: `Check a Bst-Table grid configuration for unknown props, unmet flag dependencies, inert options and capabilities that do not exist.

ALWAYS run this on Bst-Table code before presenting it. Bst-Table's flags interact in ways that fail silently rather than loudly:
  - chrome (\`show*\`) is a no-op when its behaviour flag (\`enable*\`) is off — \`showSearch\` needs \`enableGlobalFilter\`
  - \`enableClipboard\` implies \`enableCellSelection\`, and PASTE additionally needs \`enableEditing\`
  - editing and row selection need \`getRowId\`, or writes land on the wrong row after a sort
  - \`enableEditing: { mode: 'batch' }\` needs \`onSave\` or nothing is persisted
  - \`manualPagination\` needs \`rowCount\` or \`pageCount\`
  - WebSocket/live merge (I5) and infinite fetch-on-scroll (A2) are NOT implemented; row/column virtualization (D1) is now partial (\`enableVirtualization\`)

Args (supply one):
  - code (string): the JSX/TSX or options object to check
  - config (object): an already-parsed props object
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For JSON format: { "ok": boolean, "detected": string[], "findings": [ { "level": "error"|"warning"|"info", "subject": string, "message": string, "fix": string } ] }
  \`ok\` is false when any finding is an error.

Examples:
  - code="<BstTableMui showSearch enableGlobalFilter={false} .../>" -> error: showSearch is a no-op
  - code="<BstTableMui enableEditing .../>" -> error: getRowId is missing
  - config={ "enableClipboard": true } -> info: implies enableCellSelection

Error handling:
  - Returns an error when neither \`code\` nor \`config\` is supplied.
  - Detection is lexical, so a value it cannot read confidently (\`enableEditing={someVar}\`) is reported as a warning rather than asserted either way.`,
      inputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ code, config, response_format }) => {
      if (!code && !config) {
        return fail(
          'Nothing to validate.',
          'Pass `code` (the JSX/TSX snippet) or `config` (a props object).',
        )
      }

      const source = code ?? JSON.stringify(config, null, 2)
      const report = validateConfig(corpus, source, config)

      if (response_format === 'json') return ok(JSON.stringify(report, null, 2), { ...report })

      const errors = report.findings.filter((f) => f.level === 'error')
      const warnings = report.findings.filter((f) => f.level === 'warning')
      const infos = report.findings.filter((f) => f.level === 'info')

      const lines = [
        `# Bst-Table config check — ${report.ok ? '✅ no errors' : `❌ ${errors.length} error${errors.length === 1 ? '' : 's'}`}`,
        '',
        report.detected.length
          ? `Detected props: ${report.detected.map((d) => `\`${d}\``).join(', ')}`
          : '_No Bst-Table props detected — check that this is the right snippet._',
        '',
      ]

      for (const [heading, group] of [
        ['## ❌ Errors — fix these', errors],
        ['## ⚠️ Warnings — likely wrong', warnings],
        ['## ℹ️ Notes', infos],
      ] as const) {
        if (!group.length) continue
        lines.push(heading, '')
        for (const f of group) lines.push(`- **\`${f.subject}\`** — ${f.message}`, `  - _Fix:_ ${f.fix}`)
        lines.push('')
      }

      if (report.ok && !warnings.length) {
        lines.push('This configuration is internally consistent for Bst-Table v' + corpus.version + '.')
      }

      return ok(lines.join('\n'), { ...report })
    },
  )
}
