import { completable } from '@modelcontextprotocol/sdk/server/completable.js'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { BstCorpus } from './types.js'

/** The three skins a grid can be scaffolded against. */
const ADAPTERS = ['mui', 'shadcn', 'engine'] as const

/** Case-insensitive prefix/substring filter for argument completion. */
function matches(candidates: readonly string[], value: string | undefined, limit = 50): string[] {
  const q = (value ?? '').toLowerCase()
  if (!q) return [...candidates].slice(0, limit)
  const starts = candidates.filter((c) => c.toLowerCase().startsWith(q))
  const contains = candidates.filter((c) => !c.toLowerCase().startsWith(q) && c.toLowerCase().includes(q))
  return [...starts, ...contains].slice(0, limit)
}

/**
 * Guided workflows. Each encodes the tool ORDER that produces correct
 * Bst-Table code — check the installed version, look up real flags, scaffold,
 * then validate — so the agent doesn't fall back on recall from other grid
 * libraries partway through.
 */
export function registerPrompts(server: McpServer, corpus: BstCorpus): void {
  const preamble =
    `Bst-Table (\`@bloomskill/table-*\`, v${corpus.version}) is a private React data grid built on TanStack Table v9. ` +
    `It is not any other grid library — do not use APIs from other grids. ` +
    `Every capability is a per-instance flag: \`enable*\` = engine behaviour, \`show*\` = adapter chrome, and chrome is a no-op without its behaviour flag.`

  // Real flag names, so `bst-add-feature`'s argument autocompletes to props that
  // actually exist rather than a guess from another grid library.
  const flagNames = [...new Set(corpus.features.map((f) => f.flag))].sort()

  server.registerPrompt(
    'bst-quick-start',
    {
      title: 'Start a new Bst-Table grid',
      description: 'Build a new grid from a description of what it should do.',
      argsSchema: {
        requirements: z.string().describe('What the grid needs to do, in plain language'),
        adapter: completable(
          z.string().optional().describe("Preferred skin: 'mui', 'shadcn' or 'engine' (headless)"),
          (value) => matches(ADAPTERS, value),
        ),
      },
    },
    ({ requirements, adapter }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              preamble,
              '',
              `Build a Bst-Table grid for: ${requirements}`,
              adapter ? `Use the ${adapter} adapter.` : 'Ask which adapter to use if it is not obvious from the project.',
              '',
              'Work in this order:',
              '1. `bst_detect_version` on the project, to see whether it already uses Bst-Table and at which version.',
              '2. `bst_search_docs` for anything in the requirements you are unsure Bst-Table supports.',
              '3. `bst_get_feature` for each capability you plan to switch on — confirm the exact flag name and its ship status.',
              '4. `bst_get_cell_type` for each column, to get the right `meta.type` and value shape.',
              '5. `bst_scaffold_grid` to generate the component.',
              '6. `bst_validate_config` on the final code before showing it.',
              '',
              'If any requirement maps to a capability that is partial or NOT built, say so plainly and offer the documented workaround rather than generating code that pretends it works.',
            ].join('\n'),
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    'bst-add-feature',
    {
      title: 'Add a feature to an existing Bst-Table grid',
      description: 'Switch on a capability with every dependency it needs.',
      argsSchema: {
        feature: completable(
          z.string().describe('The capability to add, e.g. "batch save", "copy/paste", "master detail"'),
          (value) => matches(flagNames, value),
        ),
        code: z.string().optional().describe('The existing grid code, if you have it'),
      },
    },
    ({ feature, code }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              preamble,
              '',
              `Add this to an existing Bst-Table grid: ${feature}`,
              code ? `\nCurrent code:\n\`\`\`tsx\n${code}\n\`\`\`` : '\nFind the grid component in the project first.',
              '',
              'Work in this order:',
              '1. `bst_search_docs` to find which flag provides the capability.',
              '2. `bst_get_feature` on that flag — note its layer, default, and everything it requires or implies.',
              '3. Apply the change, adding every dependency (a `show*` flag needs its `enable*`; editing needs `getRowId` and `onDataChange`).',
              '4. `bst_validate_config` on the result, and fix every error before showing it.',
            ].join('\n'),
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    'bst-new-cell-type',
    {
      title: 'Write a custom Bst-Table cell type',
      description: 'Author and register a custom renderer/editor.',
      argsSchema: {
        description: z.string().describe('What the cell should render and how it should be edited'),
      },
    },
    ({ description }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              preamble,
              '',
              `Write a custom Bst-Table cell type: ${description}`,
              '',
              'Work in this order:',
              `1. \`bst_get_cell_type\` to check none of the ${corpus.cellTypes.length} built-in types already covers this.`,
              '2. `bst_get_api` for `defineCellType`, `createCellTypeRegistry`, `CellType`, `CellRenderProps` and `CellEditProps`.',
              '3. Write the type with `defineCellType`, then register it: start from the adapter preset (`createMuiPreset()` / `createShadcnPreset()`) so the built-in types are kept, add yours, and pass the registry as the `cellTypes` option.',
              '4. Show how a column opts in via `meta: { type: ... }`.',
              '',
              'Keep the read renderer dependency-free and cheap — it runs on the hot path for every visible cell.',
            ].join('\n'),
          },
        },
      ],
    }),
  )

  server.registerPrompt(
    'bst-migrate',
    {
      title: 'Migrate a grid to Bst-Table',
      description: 'Port a table from another grid library to Bst-Table.',
      argsSchema: {
        from: z.string().describe('The grid library being replaced (package name or product name).'),
        code: z.string().optional().describe('The existing grid code'),
      },
    },
    ({ from, code }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              preamble,
              '',
              `Migrate this ${from} grid to Bst-Table.`,
              code ? `\n\`\`\`tsx\n${code}\n\`\`\`` : '\nFind the grid component in the project first.',
              '',
              'Work in this order:',
              '1. List what the current grid actually does — columns, cell renderers, editing, selection, and any data-source wiring.',
              `2. For each, \`bst_search_docs\` / \`bst_get_feature\` to find the Bst-Table equivalent and confirm it is built. ${corpus.requirements.filter((r) => r.status !== 'built').length} of ${corpus.requirements.length} spec leaves are partial or missing — check before promising parity.`,
              '3. `bst_get_cell_type` to map each cell renderer to a `meta.type`.',
              '4. `bst_scaffold_grid` for the new component, then port the data and handlers.',
              '5. `bst_validate_config` on the result.',
              '',
              'Report anything with no equivalent explicitly instead of silently dropping it. Note that master-detail, range selection and clipboard — commonly paid-tier features elsewhere — are all included here.',
            ].join('\n'),
          },
        },
      ],
    }),
  )
}
