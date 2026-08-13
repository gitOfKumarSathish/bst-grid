import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { CHARACTER_LIMIT } from '../constants.js'
import { truncate } from '../corpus.js'
import type { FeatureEntry, RequirementEntry } from '../types.js'

/** Every listing tool offers both renderings — prose for reading, JSON for piping. */
export const ResponseFormat = z
  .enum(['markdown', 'json'])
  .default('markdown')
  .describe("Output format: 'markdown' for human-readable prose, 'json' for machine-readable data")

/** The MCP tool-result shape both success and error paths return. */
export type ToolResult = CallToolResult

/**
 * Wraps a response, truncating past {@link CHARACTER_LIMIT} so one broad query
 * can't flood the client's context.
 */
export function ok(text: string, structured?: Record<string, unknown>, hint = 'Narrow the query or lower `limit`.'): ToolResult {
  return {
    content: [{ type: 'text', text: truncate(text, CHARACTER_LIMIT, hint) }],
    ...(structured ? { structuredContent: structured } : {}),
  }
}

/**
 * An error the agent can act on. Always says what to try instead — a bare
 * "not found" makes an agent guess, and guessing is what this server exists
 * to prevent.
 */
export function fail(message: string, nextStep: string): ToolResult {
  return { content: [{ type: 'text', text: `${message}\n\n**Next step:** ${nextStep}` }], isError: true }
}

/** Status glyph + wording shared by every renderer that shows coverage. */
export function statusLabel(status: RequirementEntry['status']): string {
  return status === 'built' ? '✅ built' : status === 'partial' ? '🟡 partial' : '❌ NOT BUILT'
}

/**
 * Renders one feature as markdown. Shared by `bst_get_feature` and the
 * `bst://features` resource so a flag reads identically wherever it surfaces.
 */
export function renderFeature(feature: FeatureEntry, requirements: RequirementEntry[]): string {
  const lines = [
    `## \`${feature.flag}\` — ${feature.feature}`,
    '',
    `| | |`,
    `| --- | --- |`,
    `| **Layer** | ${feature.layer} (${feature.layer === 'engine' ? '`enable*` behaviour, resolved in `useBstTable`' : '`show*` chrome, resolved in the adapter'}) |`,
    `| **Type** | \`${feature.type}\` |`,
    `| **Default** | \`${feature.default}\` |`,
    `| **Kind** | ${feature.kind} |`,
  ]
  if (feature.mapsTo) lines.push(`| **Maps to** | ${feature.mapsTo} |`)
  if (feature.status) lines.push(`| **Status** | ${feature.status} |`)
  if (feature.group) {
    lines.push(`| **Settings sheet** | ${feature.group}${feature.alwaysShow ? ' (always shown)' : ''} |`)
  }
  if (feature.related.length > 1) {
    lines.push(`| **Related props** | ${feature.related.map((r) => `\`${r}\``).join(', ')} |`)
  }

  if (feature.doc) lines.push('', feature.doc)
  if (feature.hint) lines.push('', `_Settings-sheet hint:_ ${feature.hint}`)

  const leaves = feature.requirements
    .map((id) => requirements.find((r) => r.id === id))
    .filter((r): r is RequirementEntry => Boolean(r))
  if (leaves.length) {
    lines.push('', '**Spec coverage**')
    for (const leaf of leaves) lines.push(`- ${leaf.id} ${leaf.title} — ${statusLabel(leaf.status)}: ${leaf.notes}`)
  }
  return lines.join('\n')
}
