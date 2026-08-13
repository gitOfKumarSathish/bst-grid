import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { FeatureEntry, FeatureKind } from '../types.js'
import { codeSpans, isIdentifier, parseTable, stripMd } from './md.js'

/** One entry of the engine's runtime settings registry (see `engine/src/settings.ts`). */
interface SettingsRegistryEntry {
  key: string
  label: string
  group: string
  layer: 'engine' | 'chrome'
  default: boolean
  alwaysShow: boolean
  hint?: string
}

/**
 * Loads `BST_SETTINGS_REGISTRY` from the **built** engine — the runtime truth for
 * which toggles exist, their groups, defaults and hints. Importing the built
 * artifact (rather than re-parsing the source) means a toggle can never appear
 * here that the engine doesn't actually ship.
 */
async function loadSettingsRegistry(repoRoot: string): Promise<SettingsRegistryEntry[]> {
  const settingsUrl = pathToFileURL(join(repoRoot, 'packages/engine/dist/settings.js')).href
  try {
    const mod = (await import(settingsUrl)) as { BST_SETTINGS_REGISTRY?: SettingsRegistryEntry[] }
    if (!mod.BST_SETTINGS_REGISTRY) {
      throw new Error('BST_SETTINGS_REGISTRY is not exported')
    }
    return mod.BST_SETTINGS_REGISTRY
  } catch (error) {
    throw new Error(
      `Could not load BST_SETTINGS_REGISTRY from ${settingsUrl}. ` +
        `Build the engine first (npm run build -w @bloomskill/table-engine). ` +
        `Cause: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Extracts TSDoc comments keyed by the property they document, from a TS source
 * file. Used to attach `BstTableEngineToggles` / `UseBstTableOptions` prose to
 * each flag — the same text a developer sees on hover in their editor.
 */
export function extractTsDoc(source: string): Record<string, string> {
  const out: Record<string, string> = {}
  const re = /\/\*\*([\s\S]*?)\*\/\s*(?:\/\/[^\n]*\n\s*)*([A-Za-z_$][\w$]*)\??\s*[?:]/g
  for (const match of source.matchAll(re)) {
    const [, raw = '', name = ''] = match
    if (!name) continue
    const doc = raw
      .split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Keep the FIRST doc seen for a name: `types.ts` declares the toggles before
    // the option-object restatements, and the toggle doc is the authoritative one.
    if (doc && !out[name]) out[name] = doc
  }
  return out
}

/**
 * Pulls spec-leaf ids (`E3`, `H1–H4`, `C2`) out of a §12 row. The feature name
 * carries most of them ("Filter builder UI (E3)"), but several rows only cite
 * their leaves in the notes or TSDoc ("Clipboard … (Phase 3, H1–H4)"), so all
 * three columns are scanned. Ranges like `H1–H4` are expanded.
 */
export function requirementIdsFrom(...texts: Array<string | undefined>): string[] {
  const ids = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    // Ranges first: `H1–H4` / `B1-B10` → every leaf in between.
    for (const range of text.matchAll(/\b([A-M])(\d{1,2})\s*[–-]\s*([A-M])(\d{1,2})\b/g)) {
      const [, letter = '', from = '', toLetter = '', to = ''] = range
      if (letter !== toLetter) continue
      for (let n = Number(from); n <= Number(to) && n - Number(from) < 20; n++) ids.add(`${letter}${n}`)
    }
    for (const match of text.matchAll(/\b([A-M]\d{1,2})\b/g)) {
      if (match[1]) ids.add(match[1])
    }
  }
  return [...ids].sort()
}

/**
 * Picks the primary prop from a §12 "Flag" cell. The cell is free-form — it may
 * hold one name (`` `showSearch` ``), a name plus companions
 * (`` `enableCellSpanning` (+ `getCellSpan`) ``), a qualified form
 * (`` `meta.type: 'qr'` ``), an example call (`` `enableEditing: { mode: 'batch' }` ``),
 * or pure prose (`(in columns menu)`).
 */
export function primaryFlag(flagCell: string): string {
  for (const span of codeSpans(flagCell)) {
    if (isIdentifier(span)) return span
    const lead = span.match(/^(meta\.[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)/)
    if (lead?.[1]) return lead[1]
  }
  return stripMd(flagCell)
}

/**
 * Classifies a §12 row. Prose *before* the first code span means the row's
 * subject is a capability rather than a prop — "double-click resizer (+
 * `computeAutoWidth`)", "(in columns menu)". Prose *after* one is just a
 * qualifier ("`enableGrouping` (+ column `aggregationFn`)") and is ignored.
 */
export function classifyFlag(flag: string, flagCell: string, inRegistry: boolean): FeatureKind {
  const beforeFirstSpan = flagCell.split('`')[0] ?? flagCell
  if (/[A-Za-z]/.test(beforeFirstSpan)) return 'note'
  if (flag.startsWith('meta.')) return 'meta'
  if (inRegistry || /^(enable|show)[A-Z]/.test(flag)) return 'toggle'
  return 'prop'
}

/**
 * Builds the feature list by joining three sources:
 *  - `BST_SETTINGS_REGISTRY` (runtime: group · default · hint · alwaysShow)
 *  - the `CLAUDE.md` §12 toggle table (authoring: type · maps-to · status)
 *  - `engine/src/types.ts` TSDoc (prose)
 *
 * §12 is the spine — it covers props the settings sheet doesn't (`classNames`,
 * `rowDisabled`, `meta.type` cell types), which agents still need to know about.
 */
export async function extractFeatures(repoRoot: string): Promise<FeatureEntry[]> {
  const registry = await loadSettingsRegistry(repoRoot)
  const byKey = new Map(registry.map((e) => [e.key, e]))

  const claudeMd = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8')
  const table = parseTable(claudeMd, ['Feature', 'Flag', 'Layer', 'Type', 'Default', 'Status'])
  if (!table) throw new Error('Could not find the CLAUDE.md §12 "Feature toggle registry" table')

  const tsdoc = extractTsDoc(readFileSync(join(repoRoot, 'packages/engine/src/types.ts'), 'utf8'))

  const features: FeatureEntry[] = []
  const seen = new Set<string>()

  for (const row of table.rows) {
    const [featureCell = '', flagCell = '', layerCell = '', typeCell = '', defaultCell = '', mapsToCell = '', statusCell = ''] = row
    const feature = stripMd(featureCell)
    if (!feature) continue

    const primary = primaryFlag(flagCell)
    if (!primary) continue

    const setting = byKey.get(primary)
    // Keyed by flag AND feature name: three separate rows document `meta.type`
    // (sparkline/kpi · qr/barcode/richText · actionMenu) and two document
    // `icons` (adapter chrome vs engine body), and all of them are real.
    const key = `${primary}::${feature}`
    if (seen.has(key)) continue
    seen.add(key)

    const mapsTo = stripMd(mapsToCell)
    const doc = tsdoc[primary]

    features.push({
      flag: primary,
      flagRaw: stripMd(flagCell),
      kind: classifyFlag(primary, flagCell, Boolean(setting)),
      related: codeSpans(flagCell).filter(isIdentifier),
      feature,
      ...(setting?.label ? { label: setting.label } : {}),
      layer: stripMd(layerCell).startsWith('chrome') ? 'chrome' : 'engine',
      type: stripMd(typeCell) || 'boolean',
      default: stripMd(defaultCell) || '—',
      ...(mapsTo ? { mapsTo } : {}),
      ...(stripMd(statusCell) ? { status: stripMd(statusCell) } : {}),
      ...(setting ? { group: setting.group, alwaysShow: setting.alwaysShow } : {}),
      ...(setting?.hint ? { hint: setting.hint } : {}),
      inSettingsSheet: Boolean(setting),
      ...(doc ? { doc } : {}),
      requirements: requirementIdsFrom(feature, mapsTo, doc),
    })
  }

  // Parity guard: every toggle the engine actually ships must be documented in
  // §12. This is the same check `settings.ts` enforces at compile time for the
  // settings sheet — here it stops the MCP server shipping a blind spot.
  const documented = new Set(features.map((f) => f.flag))
  const missing = registry.map((e) => e.key).filter((k) => !documented.has(k))
  if (missing.length) {
    throw new Error(
      `These engine toggles are in BST_SETTINGS_REGISTRY but missing from the CLAUDE.md §12 ` +
        `registry table, so the MCP server would not know them: ${missing.join(', ')}. ` +
        `Add a §12 row for each (CLAUDE.md §12 "Add a row here … whenever a feature is introduced").`,
    )
  }

  return features
}
