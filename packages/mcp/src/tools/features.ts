import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { findFeature, findRequirement, suggestFeatures } from '../corpus.js'
import { compareSemver } from '../semver.js'
import type { BstCorpus, FeatureEntry } from '../types.js'
import { ResponseFormat, fail, ok, renderFeature, statusLabel } from './shared.js'

const inputSchema = {
  flag: z
    .string()
    .optional()
    .describe("A single flag or prop, e.g. 'enableClipboard', 'showSearch', 'conditionalFormats'"),
  requirement: z
    .string()
    .optional()
    .describe("A spec leaf id, e.g. 'I5' (live updates) or 'H4' (paste) — use to ask 'is X supported?'"),
  group: z
    .string()
    .optional()
    .describe("Filter the listing by settings-sheet group, e.g. 'Editing', 'Columns'"),
  layer: z
    .enum(['engine', 'chrome'])
    .optional()
    .describe("Filter the listing: 'engine' = enable* behaviour, 'chrome' = show* adapter UI"),
  kind: z
    .enum(['toggle', 'prop', 'meta', 'note'])
    .optional()
    .describe("Filter the listing: 'toggle' = boolean feature flags only"),
  installedVersion: z
    .string()
    .optional()
    .describe(
      "The project's installed Bst-Table version (from bst_detect_version), e.g. '0.30.0'. When set with a `flag`, the answer states plainly whether that flag exists in that version, using the version it shipped in.",
    ),
  response_format: ResponseFormat,
}

/**
 * This tool answers three questions with three payload shapes — a single flag,
 * a spec requirement, or a filtered listing — so every field is optional and the
 * object branches carry `.passthrough()` to keep the richer flag/requirement
 * fields (`doc`, `requirements`, `related`, …) the listing view omits.
 */
const outputSchema = {
  count: z.number().optional().describe('Present on listing responses: number of features returned'),
  features: z
    .array(
      z
        .object({
          flag: z.string(),
          feature: z.string(),
          layer: z.string(),
          kind: z.string(),
          type: z.string(),
          default: z.string(),
          since: z.string().optional().describe('Version the flag first shipped in, when known'),
        })
        .passthrough(),
    )
    .optional()
    .describe('Present when a flag or a listing is requested'),
  requirement: z
    .object({ id: z.string(), title: z.string(), status: z.string(), notes: z.string() })
    .passthrough()
    .optional()
    .describe('Present when a spec requirement id is requested'),
  implementedBy: z.array(z.string()).optional().describe('Flags implementing the requested requirement'),
  availability: z
    .object({
      installedVersion: z.string(),
      since: z.string().optional().describe('Version the flag shipped in; absent if it predates the tracked changelog'),
      available: z.boolean().describe('Whether the flag exists in installedVersion'),
    })
    .optional()
    .describe('Present when `installedVersion` was supplied alongside a `flag`'),
}

/**
 * The feature/coverage tool. Deliberately folds in the spec matrix: an agent
 * asking "does Bst-Table do live WebSocket updates?" must get **no** with the
 * workaround, not a plausible invention. Coverage lives one argument away from
 * features because they are the same question asked two ways.
 */
export function registerFeatureTool(server: McpServer, corpus: BstCorpus): void {
  server.registerTool(
    'bst_get_feature',
    {
      title: 'Get a Bst-Table feature flag or check spec coverage',
      description: `Look up a Bst-Table feature toggle, prop, or spec requirement — or list them all.

Every Bst-Table capability is a per-instance flag in one of two layers: \`enable*\` = engine behaviour (resolved in \`useBstTable\`), \`show*\` = adapter chrome (resolved in the MUI/shadcn adapter). Data features default ON; heavy features (editing, selection, clipboard) default OFF.

ALWAYS check here before claiming Bst-Table supports something. ${corpus.requirements.filter((r) => r.status !== 'built').length} of the ${corpus.requirements.length} spec leaves are partial or missing — notably I5 (external / WebSocket live-merge), which is NOT built. (Row/column virtualization D1 and infinite scroll A2 ARE built — do not assume otherwise.)

Args (all optional — with none, returns the full registry):
  - flag (string): one flag/prop name, e.g. 'enableClipboard'
  - requirement (string): one spec leaf id, e.g. 'D1'
  - group (string): filter the listing by settings-sheet group
  - layer ('engine' | 'chrome'): filter the listing by layer
  - kind ('toggle' | 'prop' | 'meta' | 'note'): filter the listing; 'toggle' = boolean flags only
  - installedVersion (string): the project's installed version (from bst_detect_version); with a flag, states whether that flag exists in that version
  - response_format ('markdown' | 'json'): output format (default: 'markdown')

Returns:
  For a flag — layer, type, default, what it maps to, ship status, the version it shipped in (\`since\`), settings-sheet group, related props, TSDoc and the spec leaves it implements. With installedVersion, a leading verdict: ✅ available / ⚠️ NOT available in that version.
  For a requirement — ✅ built / 🟡 partial / ❌ NOT BUILT plus the documented workaround.
  For a listing — { "count": number, "features": [...] } (JSON) or a grouped table (markdown).

Examples:
  - flag="enableClipboard" -> the toggle, and that it implies enableCellSelection while paste needs enableEditing
  - flag="enableFind", installedVersion="0.30.0" -> ⚠️ NOT available: Find ships in 0.42.0, project is on 0.30.0
  - requirement="I5" -> ❌ NOT BUILT, with the replace-the-data-prop workaround
  - kind="toggle", layer="engine" -> every engine behaviour flag

Error handling:
  - An unknown flag returns near-miss suggestions rather than an empty result.`,
      inputSchema,
      outputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ flag, requirement, group, layer, kind, installedVersion, response_format }) => {
      if (requirement) return describeRequirement(corpus, requirement, response_format)
      if (flag) return describeFlag(corpus, flag, response_format, installedVersion)
      return listFeatures(corpus, { group, layer, kind }, response_format)
    },
  )
}

function describeRequirement(corpus: BstCorpus, id: string, format: 'markdown' | 'json') {
  const leaf = findRequirement(corpus, id)
  if (!leaf) {
    return fail(
      `No spec requirement '${id}'.`,
      `Requirement ids look like A1-A6, B1-B10, C1-C6, D1-D4, E1-E4, F1-F5, G1-G4, H1-H4, I1-I5, J1-J2, K1-K3, L1-L3, M1-M2. Call \`bst_get_feature()\` with no arguments to see the full registry, or \`bst_search_docs\` to search by name.`,
    )
  }

  const implementedBy = corpus.features.filter((f) => f.requirements.includes(leaf.id))
  const structured = { requirement: leaf, implementedBy: implementedBy.map((f) => f.flag) }
  if (format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

  const lines = [
    `## ${leaf.id} — ${leaf.title}`,
    '',
    `**Status:** ${statusLabel(leaf.status)}`,
    '',
    leaf.notes,
  ]
  if (implementedBy.length) {
    lines.push('', '**Flags that implement it**')
    for (const f of implementedBy) lines.push(`- \`${f.flag}\` — ${f.feature}`)
  }
  if (leaf.status !== 'built') {
    lines.push(
      '',
      `> ⚠️ Do not generate code that assumes this works. The notes above describe what actually ships and any workaround.`,
    )
  }
  return ok(lines.join('\n'), structured)
}

function describeFlag(corpus: BstCorpus, flag: string, format: 'markdown' | 'json', installedVersion?: string) {
  const exact = findFeature(corpus, flag)
  if (!exact) {
    const near = suggestFeatures(corpus, flag)
    return fail(
      `No Bst-Table flag or prop named '${flag}'.`,
      near.length
        ? `Did you mean ${near.map((f) => `\`${f.flag}\``).join(', ')}? Or call \`bst_get_feature()\` with no arguments for the full registry.`
        : `Call \`bst_get_feature()\` with no arguments for the full registry, or \`bst_search_docs({ query: "${flag}" })\` to search the docs.`,
    )
  }

  // A few names legitimately head more than one row (`meta.type`, `icons`).
  const all = corpus.features.filter((f) => f.flag === exact.flag)
  const availability = installedVersion ? availabilityOf(all, installedVersion) : undefined
  const structured = { features: all, ...(availability ? { availability } : {}) }
  if (format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

  const detail = all.map((f) => renderFeature(f, corpus.requirements)).join('\n\n---\n\n')
  const banner = availability ? availabilityBanner(exact.flag, availability) : undefined
  return ok(banner ? `${banner}\n\n${detail}` : detail, structured)
}

/** The availability verdict as structured data (no prose) — safe to put in `structuredContent`. */
interface Availability {
  installedVersion: string
  since?: string
  available: boolean
}

/**
 * Decides whether `flag` exists in `installedVersion`. Uses the **most
 * restrictive** (highest) `since` among the rows a flag name heads, and fails
 * safe: a flag with no recorded `since` predates the tracked changelog, so it is
 * treated as present in every version rather than warned about.
 */
function availabilityOf(features: FeatureEntry[], installedVersion: string): Availability {
  const since = features
    .map((f) => f.since)
    .filter((v): v is string => Boolean(v))
    .sort(compareSemver)
    .at(-1)
  const available = since ? compareSemver(installedVersion, since) >= 0 : true
  return { installedVersion, ...(since ? { since } : {}), available }
}

/** Renders {@link availabilityOf}'s verdict as the banner line shown above the flag detail. */
function availabilityBanner(flag: string, a: Availability): string {
  if (!a.since) {
    return `> ℹ️ \`${flag}\` is available in your version (v${a.installedVersion}) — it predates the tracked changelog, so it exists in every release.`
  }
  return a.available
    ? `> ✅ \`${flag}\` **is available** in your version — it ships in v${a.since}, and this project is on v${a.installedVersion}.`
    : `> ⚠️ \`${flag}\` is **NOT available** in your version — it ships in **v${a.since}**, but this project is on **v${a.installedVersion}**. Upgrade \`@bloomskill/table-*\` to ≥ v${a.since}, or use the documented workaround instead of this flag.`
}

function listFeatures(
  corpus: BstCorpus,
  filters: { group?: string; layer?: 'engine' | 'chrome'; kind?: FeatureEntry['kind'] },
  format: 'markdown' | 'json',
) {
  const matches = corpus.features.filter(
    (f) =>
      (!filters.layer || f.layer === filters.layer) &&
      (!filters.kind || f.kind === filters.kind) &&
      (!filters.group || (f.group ?? '').toLowerCase() === filters.group.toLowerCase()),
  )

  if (!matches.length) {
    const groups = [...new Set(corpus.features.map((f) => f.group).filter(Boolean))]
    return fail(
      `No features matched those filters.`,
      `Known settings-sheet groups: ${groups.map((g) => `'${g}'`).join(', ')}. Layers: 'engine', 'chrome'. Kinds: 'toggle', 'prop', 'meta', 'note'.`,
    )
  }

  const structured = {
    count: matches.length,
    features: matches.map((f) => ({
      flag: f.flag,
      feature: f.feature,
      layer: f.layer,
      kind: f.kind,
      type: f.type,
      default: f.default,
      group: f.group,
      status: f.status,
      since: f.since,
    })),
  }
  if (format === 'json') return ok(JSON.stringify(structured, null, 2), structured)

  const byGroup = new Map<string, FeatureEntry[]>()
  for (const f of matches) {
    const key = f.group ?? (f.layer === 'chrome' ? 'Adapter chrome (not in settings sheet)' : 'Other engine options')
    byGroup.set(key, [...(byGroup.get(key) ?? []), f])
  }

  const lines = [
    `# Bst-Table features (${matches.length}) — corpus v${corpus.version}`,
    '',
    '`enable*` = engine behaviour · `show*` = adapter chrome. A `show*` flag is a no-op when its underlying `enable*` is off.',
    '',
  ]
  for (const [groupName, items] of byGroup) {
    lines.push(`## ${groupName}`, '', '| Flag | Layer | Type | Default | What it does |', '| --- | --- | --- | --- | --- |')
    for (const f of items) {
      lines.push(`| \`${f.flag}\` | ${f.layer} | \`${f.type}\` | \`${f.default}\` | ${f.feature} |`)
    }
    lines.push('')
  }
  lines.push('_Call `bst_get_feature({ flag })` for one flag\'s full detail, including its dependencies._')

  return ok(lines.join('\n'), structured, 'Add `group`, `layer` or `kind` to narrow the listing.')
}
