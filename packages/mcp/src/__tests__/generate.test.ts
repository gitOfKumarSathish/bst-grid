import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BST_SETTINGS_REGISTRY } from '../../../engine/src/settings.js'
import { findRepoRoot } from '../constants.js'
import { classifyFlag, extractTsDoc, primaryFlag, requirementIdsFrom } from '../generate/features.js'
import { docSources } from '../generate/docs.js'
import { findStaleSources } from '../generate/freshness.js'
import { codeSpans, parseTable, sections, slugify, stripMd } from '../generate/md.js'
import { buildSearchIndex } from '../search/index.js'
import type { BstCorpus } from '../types.js'

const repoRoot = findRepoRoot(process.cwd())
const corpusPath = join(repoRoot ?? '', 'packages/mcp/dist/corpus.json')

/**
 * The corpus is a build artifact. When it's absent the integration suite skips
 * with a clear pointer rather than failing for the wrong reason — the pure unit
 * tests below still run.
 */
const corpus: BstCorpus | undefined = existsSync(corpusPath)
  ? (JSON.parse(readFileSync(corpusPath, 'utf8')) as BstCorpus)
  : undefined

const describeCorpus = corpus ? describe : describe.skip

describe('markdown helpers', () => {
  it('splits table cells on unescaped pipes only', () => {
    const md = ['| Flag | Type |', '| --- | --- |', '| `pagination` | boolean \\| {pageSize} |'].join('\n')
    const table = parseTable(md, ['Flag', 'Type'])
    expect(table?.rows[0]).toEqual(['`pagination`', 'boolean | {pageSize}'])
  })

  it('ignores headings inside fenced code blocks', () => {
    const md = ['## Real', 'body', '```bash', '# not a heading', '```', 'more'].join('\n')
    const found = sections(md)
    expect(found.map((s) => s.headingPath.at(-1))).toEqual(['Real'])
    expect(found[0]?.text).toContain('# not a heading')
  })

  it('extracts code spans and builds GitHub-style anchors', () => {
    expect(codeSpans('`classNames` / `styles`')).toEqual(['classNames', 'styles'])
    expect(slugify('Batch editing and single-call save')).toBe('batch-editing-and-single-call-save')
    expect(stripMd('**bold** and `code`')).toBe('bold and code')
  })
})

describe('feature-row parsing', () => {
  it('picks the primary prop out of every §12 flag-cell shape', () => {
    expect(primaryFlag('`showSearch`')).toBe('showSearch')
    expect(primaryFlag('`showFormatBuilder` (+ `onConditionalFormatsChange`)')).toBe('showFormatBuilder')
    expect(primaryFlag('`classNames` / `styles`')).toBe('classNames')
    expect(primaryFlag("`meta.type: 'qr'` / `'barcode'`")).toBe('meta.type')
    expect(primaryFlag("`enableEditing: { mode: 'batch' }` + `onSave`")).toBe('enableEditing')
  })

  it('separates lintable toggles from other documented API', () => {
    expect(classifyFlag('enableSorting', '`enableSorting`', true)).toBe('toggle')
    expect(classifyFlag('enableGrouping', '`enableGrouping` (+ column `aggregationFn`)', true)).toBe('toggle')
    expect(classifyFlag('classNames', '`classNames` / `styles`', false)).toBe('prop')
    expect(classifyFlag('meta.type', "`meta.type: 'qr'`", false)).toBe('meta')
    expect(classifyFlag('computeAutoWidth', 'double-click resizer (+ `computeAutoWidth`)', false)).toBe('note')
    expect(classifyFlag('in columns menu', '(in columns menu)', false)).toBe('note')
  })

  it('collects spec-leaf ids across columns and expands ranges', () => {
    expect(requirementIdsFrom('Filter builder UI (E3)')).toEqual(['E3'])
    expect(requirementIdsFrom('Custom-CSS slots (K1/K2)')).toEqual(['K1', 'K2'])
    expect(requirementIdsFrom(undefined, undefined, 'Clipboard (Phase 3, H1–H4)')).toEqual([
      'H1',
      'H2',
      'H3',
      'H4',
    ])
  })

  it('reads TSDoc keyed by the property it documents', () => {
    const docs = extractTsDoc(`
      export interface X {
        /** Column sorting. Maps to v9 \`enableSorting\`. Default: true. */
        enableSorting?: boolean
      }
    `)
    expect(docs.enableSorting).toBe('Column sorting. Maps to v9 `enableSorting`. Default: true.')
  })
})

describeCorpus('generated corpus', () => {
  const c = corpus as BstCorpus

  it('is stamped with the version.ini version', () => {
    expect(c.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('records a full ISO-8601 generation timestamp (not just a date)', () => {
    expect(c.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    expect(Number.isNaN(new Date(c.generatedAt).getTime())).toBe(false)
  })

  /**
   * THE drift guard. Every toggle the engine actually ships must be in the
   * corpus, so the MCP server can never quietly stop knowing about a feature.
   * Mirrors the compile-time parity check `engine/src/settings.ts` enforces for
   * the runtime settings sheet (CLAUDE.md §12).
   */
  it('knows every toggle in BST_SETTINGS_REGISTRY', () => {
    const known = new Set(c.features.map((f) => f.flag))
    const missing = BST_SETTINGS_REGISTRY.map((e) => e.key).filter((k) => !known.has(k))
    expect(missing).toEqual([])
  })

  it('marks settings-sheet toggles with their group and default', () => {
    const sorting = c.features.find((f) => f.flag === 'enableSorting')
    expect(sorting).toMatchObject({
      layer: 'engine',
      kind: 'toggle',
      inSettingsSheet: true,
      group: 'Data operations',
    })
    expect(sorting?.doc).toBeTruthy()
  })

  it('carries all 58 spec leaves with the documented tally', () => {
    expect(c.requirements).toHaveLength(58)
    const tally = c.requirements.reduce<Record<string, number>>((acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1
      return acc
    }, {})
    expect(tally).toEqual({ built: 51, partial: 5, missing: 2 })
  })

  /**
   * The anti-hallucination rows: an agent must be able to learn that
   * virtualization and live/WebSocket merge do NOT exist, or it will invent them.
   */
  it('reports the unbuilt capabilities as missing, with notes', () => {
    for (const id of ['D1', 'I5']) {
      const leaf = c.requirements.find((r) => r.id === id)
      expect(leaf?.status).toBe('missing')
      expect(leaf?.notes.length).toBeGreaterThan(10)
    }
  })

  it('catalogues every cell type with a value shape', () => {
    expect(c.cellTypes.length).toBeGreaterThanOrEqual(17)
    for (const cell of c.cellTypes) {
      expect(cell.type).toMatch(/^[a-zA-Z]+$/)
      expect(cell.valueShape.length).toBeGreaterThan(0)
    }
    expect(c.cellTypes.find((t) => t.type === 'sparkline')?.cellMetaDetail).toContain('variant')
  })

  it('chunks the docs with a citable source and anchor', () => {
    expect(c.docs.length).toBeGreaterThan(40)
    for (const chunk of c.docs) {
      expect(chunk.source).toMatch(/\.md$/)
      expect(chunk.headingPath.length).toBeGreaterThan(0)
      expect(chunk.text.length).toBeGreaterThan(0)
    }
    expect(c.docs.some((d) => d.pkg === 'mui')).toBe(true)
    expect(c.docs.some((d) => d.pkg === 'shadcn')).toBe(true)
  })

  /**
   * The server documents itself: its README and setup guide are in the index, so
   * `bst_search_docs("install mcp")` can answer how to set up the very tool being
   * called. `docs/mcp-server.md` arrives via the `docs/*.md` glob (no code change
   * per new guide); `packages/mcp/README.md` via the fourth package README.
   */
  it('indexes its own README and setup guide (self-documenting)', () => {
    expect(c.docs.some((d) => d.source === 'packages/mcp/README.md')).toBe(true)
    expect(c.docs.some((d) => d.source === 'docs/mcp-server.md')).toBe(true)
    expect(c.docs.some((d) => d.pkg === 'mcp')).toBe(true)

    // The stated goal: a search for MCP setup lands on the MCP docs.
    const index = buildSearchIndex(c)
    const hits = index.search('how do I install the mcp server in claude code', 5)
    expect(hits.some((h) => /mcp/i.test(h.payload.source))).toBe(true)
  })

  it('picks up every docs/*.md by glob, so new guides self-index', () => {
    const globbed = docSources(repoRoot as string)
      .filter((s) => s.path.startsWith('docs/'))
      .map((s) => s.path)
    // Both current guides are present without being named in code.
    expect(globbed).toEqual(expect.arrayContaining(['docs/settings-sheet.md', 'docs/mcp-server.md']))
    for (const path of globbed) {
      expect(c.docs.some((d) => d.source === path)).toBe(true)
    }
  })

  /**
   * The prose parity guard. `sourceFiles` lists every concrete input; none may be
   * newer than `generatedAt`, or the corpus has drifted from its sources. After a
   * fresh build (the `npm run mcp` gate builds first) this is always clean; it
   * fails only when a doc/README/source was edited without rebuilding the corpus.
   */
  it('is not stale relative to any indexed source', () => {
    expect(c.sourceFiles.length).toBeGreaterThan(10)
    const stale = findStaleSources(c, repoRoot as string)
    expect(
      stale,
      stale.length
        ? `Corpus is stale — rebuild it (npm run build -w @bloomskill/table-mcp). Newer than the corpus: ${stale
            .map((s) => s.path)
            .join(', ')}`
        : '',
    ).toEqual([])
  })

  it('exposes the engine entry points an agent needs to import', () => {
    const symbols = new Set(c.api.map((a) => a.symbol))
    for (const symbol of ['useBstTable', 'BstTable', 'createCellTypeRegistry', 'useBstDataSource']) {
      expect(symbols).toContain(symbol)
    }
  })

  it('inlines the runnable examples', () => {
    expect(c.examples.length).toBeGreaterThanOrEqual(6)
    const quickStart = c.examples.find((e) => e.name === 'quick-start')
    expect(quickStart?.files.some((f) => f.path.endsWith('App.tsx'))).toBe(true)
    expect(quickStart?.description).toBeTruthy()
  })
})
