import { ResourceTemplate, type McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { buildAgentPrompt } from './agent-prompt.js'
import { statusLabel } from './tools/shared.js'
import type { BstCorpus } from './types.js'

/**
 * Read-only views of the corpus under `bst://`. Resources suit the static,
 * URI-addressable slices — a client can attach "the coverage matrix" to a
 * conversation without an agent having to call a tool for it.
 */
export function registerResources(server: McpServer, corpus: BstCorpus): void {
  server.registerResource(
    'prompt',
    'bst://prompt',
    {
      title: 'Bst-Table agent prompt',
      description:
        `The paste-anywhere briefing that teaches a model this API in one message: entry points, ` +
        `the enable*/show* rule, all ${corpus.features.filter((f) => f.kind === 'toggle').length} ` +
        `toggles, ${corpus.cellTypes.length} cell types and the dependencies that are easy to miss. ` +
        `Attach it when handing work to a model that cannot reach these tools.`,
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [{ uri: uri.href, mimeType: 'text/markdown', text: buildAgentPrompt(corpus) }],
    }),
  )

  server.registerResource(
    'coverage',
    'bst://coverage',
    {
      title: 'Bst-Table spec coverage',
      description: `The ${corpus.requirements.length}-leaf requirement matrix: what is built, partial, and NOT built in v${corpus.version}.`,
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            `# Bst-Table coverage — v${corpus.version}`,
            '',
            '| ID | Requirement | Status | Notes |',
            '| --- | --- | --- | --- |',
            ...corpus.requirements.map(
              (r) => `| ${r.id} | ${r.title} | ${statusLabel(r.status)} | ${r.notes} |`,
            ),
          ].join('\n'),
        },
      ],
    }),
  )

  server.registerResource(
    'features',
    'bst://features',
    {
      title: 'Bst-Table feature toggles',
      description: `All ${corpus.features.length} flags and props: layer, type, default, status.`,
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            `# Bst-Table features — v${corpus.version}`,
            '',
            '`enable*` = engine behaviour · `show*` = adapter chrome.',
            '',
            '| Flag | Layer | Type | Default | Feature |',
            '| --- | --- | --- | --- | --- |',
            ...corpus.features.map(
              (f) => `| \`${f.flag}\` | ${f.layer} | \`${f.type}\` | \`${f.default}\` | ${f.feature} |`,
            ),
          ].join('\n'),
        },
      ],
    }),
  )

  server.registerResource(
    'cell-types',
    'bst://cell-types',
    {
      title: 'Bst-Table cell types',
      description: `All ${corpus.cellTypes.length} \`meta.type\` renderers with their value shapes.`,
      mimeType: 'text/markdown',
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: [
            `# Bst-Table cell types — v${corpus.version}`,
            '',
            '| `meta.type` | Renders | Value shape | Editable | `cellMeta` |',
            '| --- | --- | --- | --- | --- |',
            ...corpus.cellTypes.map(
              (c) => `| \`${c.type}\` | ${c.renders} | \`${c.valueShape}\` | ${c.editable} | ${c.cellMeta || '—'} |`,
            ),
          ].join('\n'),
        },
      ],
    }),
  )

  server.registerResource(
    'example',
    new ResourceTemplate('bst://example/{name}', {
      list: async () => ({
        resources: corpus.examples.map((e) => ({
          uri: `bst://example/${e.name}`,
          name: e.name,
          description: e.description,
          mimeType: 'text/markdown',
        })),
      }),
      // Autocomplete the {name} variable to real example names.
      complete: {
        name: (value: string) => {
          const q = value.toLowerCase()
          return corpus.examples.map((e) => e.name).filter((n) => n.toLowerCase().includes(q))
        },
      },
    }),
    {
      title: 'Bst-Table runnable example',
      description: 'The full source of one runnable example app.',
      mimeType: 'text/markdown',
    },
    async (uri, variables) => {
      const name = String(variables.name)
      const example = corpus.examples.find((e) => e.name === name)
      if (!example) {
        throw new Error(
          `No example '${name}'. Available: ${corpus.examples.map((e) => e.name).join(', ')}.`,
        )
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: [
              `# ${example.name}`,
              '',
              example.description,
              '',
              ...example.files.flatMap((f) => [`## \`${f.path}\``, '', '```tsx', f.code, '```', '']),
            ].join('\n'),
          },
        ],
      }
    },
  )
}
