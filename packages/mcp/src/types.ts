/**
 * The shape of `dist/corpus.json` — everything the MCP server knows about
 * Bst-Table. It is **generated from source** at build time (see `src/generate/`),
 * never hand-written, so it cannot drift from the packages it documents.
 */

/** Which package a doc chunk came from. */
export type BstPackage = 'engine' | 'mui' | 'shadcn' | 'mcp' | 'docs' | 'root'

/**
 * What kind of API surface a §12 row describes. Only `toggle` rows are boolean
 * feature flags that `bst_validate_config` can lint; the rest are documented
 * API that still belongs in the corpus.
 */
export type FeatureKind =
  /** An `enable*` / `show*` boolean feature flag. */
  | 'toggle'
  /** A non-boolean configuration prop (`classNames`, `conditionalFormats`, `icons`). */
  | 'prop'
  /** Column metadata (`meta.type`, `meta.disabled`, `meta.headerClassName`). */
  | 'meta'
  /** A capability with no prop of its own (a menu control, a double-click gesture). */
  | 'note'

/** A `enable*` / `show*` feature toggle (CLAUDE.md §12 registry). */
export interface FeatureEntry {
  /** The prop name, e.g. `enableClipboard`. */
  flag: string
  /** The §12 "Flag" cell verbatim — keeps sibling props and prose the flag name drops. */
  flagRaw: string
  /** Whether this row is a lintable boolean toggle or another kind of API. */
  kind: FeatureKind
  /** Every prop named in the flag cell, e.g. `['enableCellSpanning', 'getCellSpan']`. */
  related: string[]
  /** Human name from the §12 "Feature" column, e.g. "Clipboard (copy/paste)". */
  feature: string
  /** Display label used by the settings sheet. */
  label?: string
  /** `enable*` = engine behaviour · `show*` = adapter chrome (§12's two layers). */
  layer: 'engine' | 'chrome'
  /** Declared prop type, e.g. `boolean` or `boolean | EditingOptions`. */
  type: string
  /** Default as written in §12 — a string, since some are "follows `enableEditing`". */
  default: string
  /** What it maps to (a v9 option, a custom feature, adapter chrome). */
  mapsTo?: string
  /** Ship status from §12, e.g. "✅ done (Phase 3)". */
  status?: string
  /**
   * The earliest released version whose `CHANGELOG.md` section names this flag —
   * a faithful "first shipped in" version, since release discipline (§13) adds a
   * changelog bullet per new flag. Absent for the oldest defaults that predate the
   * tracked changelog (`enableSorting`, `pagination`), which exist in every
   * version anyway. Lets `bst_get_feature` and `bst_detect_version` tell an agent
   * a feature postdates the version the project actually has installed.
   */
  since?: string
  /** Settings-sheet group ("Data operations", "Columns", …) when it appears there. */
  group?: string
  /** Shown in the settings sheet even while off (default-on features). */
  alwaysShow?: boolean
  /** Short hint rendered under the settings-sheet label. */
  hint?: string
  /** Whether the runtime settings sheet exposes this toggle. */
  inSettingsSheet: boolean
  /** TSDoc from `BstTableEngineToggles` / `UseBstTableOptions`. */
  doc?: string
  /** Spec leaves this flag implements, e.g. `['H1','H2','H3','H4']`. */
  requirements: string[]
}

/** One of the 58 spec leaves from COVERAGE.md. */
export interface RequirementEntry {
  /** Leaf id, e.g. `D1`. */
  id: string
  /** Requirement name, e.g. "Row & column virtualization". */
  title: string
  /** ✅ built · 🟡 partial · ❌ missing. */
  status: 'built' | 'partial' | 'missing'
  /** The "Where / why" column — includes workarounds for partial/missing leaves. */
  notes: string
}

/** A `meta.type` cell renderer/editor (engine README "Cell types"). */
export interface CellTypeEntry {
  /** The `meta.type` value, e.g. `singleSelect`. */
  type: string
  /** What the read renderer shows. */
  renders: string
  /** Expected cell value type. */
  valueShape: string
  /** Editor, or "read-only". */
  editable: string
  /** Notable `cellMeta` fields for this type. */
  cellMeta: string
  /** Per-field `cellMeta` docs from the "`cellMeta` by cell type" section. */
  cellMetaDetail?: string
}

/** A searchable slice of documentation, split on markdown headings. */
export interface DocChunk {
  /** Stable id, e.g. `engine/batch-editing-and-single-call-save`. */
  id: string
  /** Repo-relative source path. */
  source: string
  pkg: BstPackage
  /** Heading ancestry, outermost first. */
  headingPath: string[]
  /** GitHub-style anchor for the deepest heading. */
  anchor: string
  /** The chunk's markdown body (heading line excluded). */
  text: string
}

/** A public export of `@bloomskill/table-engine`. */
export interface ApiEntry {
  symbol: string
  kind: 'function' | 'const' | 'type' | 'interface' | 'class' | 'unknown'
  signature: string
  doc?: string
}

/** One of the runnable apps under `examples/`. */
export interface ExampleEntry {
  name: string
  description: string
  files: Array<{ path: string; code: string }>
}

/** The complete generated knowledge base. */
export interface BstCorpus {
  /** The `version.ini` version these packages/docs were generated from. */
  version: string
  /** Full ISO-8601 timestamp of when the corpus was generated. */
  generatedAt: string
  /** Human-readable list of the source kinds the corpus was extracted from. */
  sources: string[]
  /**
   * Repo-relative paths of every concrete file the corpus was built from. The
   * freshness guard (`findStaleSources`) compares each one's mtime to
   * {@link generatedAt}, so a source edited after the last build fails the gate —
   * the prose counterpart of the toggle/rule parity guards.
   */
  sourceFiles: string[]
  features: FeatureEntry[]
  requirements: RequirementEntry[]
  cellTypes: CellTypeEntry[]
  docs: DocChunk[]
  api: ApiEntry[]
  examples: ExampleEntry[]
}
