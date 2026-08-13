import type { BstCorpus, BstPackage } from '../types.js'
import { Bm25Index, type IndexDoc } from './bm25.js'

/** What a search hit points at. */
export type SearchKind = 'doc' | 'feature' | 'cellType' | 'requirement' | 'api' | 'example'

/** A corpus record, flattened for ranking and rendering. */
export interface SearchRecord {
  kind: SearchKind
  /** Heading / flag / symbol — what the hit is called. */
  title: string
  /** Repo-relative source with anchor, so the agent can cite it. */
  source: string
  /** The content to show. */
  body: string
  /** Which package it belongs to, when that's meaningful. */
  pkg?: BstPackage
}

/**
 * One index over *everything* the corpus knows, not just prose. A question like
 * "how do I turn on clipboard paste" should be able to land on the toggle row,
 * the README section and the editing example — they answer different halves of it.
 */
export function buildSearchIndex(corpus: BstCorpus): Bm25Index<SearchRecord> {
  const docs: Array<IndexDoc<SearchRecord>> = []

  for (const chunk of corpus.docs) {
    docs.push({
      id: `doc:${chunk.id}`,
      boostText: chunk.headingPath.join(' '),
      text: chunk.text,
      payload: {
        kind: 'doc',
        title: chunk.headingPath.join(' › '),
        source: `${chunk.source}#${chunk.anchor}`,
        body: chunk.text,
        pkg: chunk.pkg,
      },
    })
  }

  for (const feature of corpus.features) {
    const body = [
      `**\`${feature.flagRaw}\`** — ${feature.feature}`,
      `Layer: ${feature.layer} · Type: \`${feature.type}\` · Default: \`${feature.default}\``,
      feature.group ? `Settings sheet: ${feature.group}` : '',
      feature.doc ?? '',
      feature.mapsTo ? `Maps to: ${feature.mapsTo}` : '',
      feature.status ? `Status: ${feature.status}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    docs.push({
      id: `feature:${feature.flag}:${feature.feature}`,
      boostText: `${feature.flag} ${feature.feature} ${feature.label ?? ''}`,
      text: body,
      payload: {
        kind: 'feature',
        title: feature.flag,
        source: 'CLAUDE.md §12 feature toggle registry',
        body,
      },
    })
  }

  for (const cell of corpus.cellTypes) {
    const body = [
      `**\`meta.type: '${cell.type}'\`** — ${cell.renders}`,
      `Value: \`${cell.valueShape}\` · Editable: ${cell.editable}`,
      cell.cellMeta ? `cellMeta: ${cell.cellMeta}` : '',
      cell.cellMetaDetail ?? '',
    ]
      .filter(Boolean)
      .join('\n')

    docs.push({
      id: `cellType:${cell.type}`,
      boostText: `${cell.type} cell type meta.type`,
      text: body,
      payload: {
        kind: 'cellType',
        title: `meta.type: '${cell.type}'`,
        source: 'packages/engine/README.md#cell-types',
        body,
      },
    })
  }

  for (const req of corpus.requirements) {
    const label = req.status === 'built' ? '✅ built' : req.status === 'partial' ? '🟡 partial' : '❌ NOT BUILT'
    const body = `**${req.id} ${req.title}** — ${label}\n${req.notes}`
    docs.push({
      id: `requirement:${req.id}`,
      boostText: `${req.id} ${req.title}`,
      text: body,
      payload: { kind: 'requirement', title: `${req.id} ${req.title}`, source: 'COVERAGE.md', body },
    })
  }

  for (const api of corpus.api) {
    const body = [api.doc ?? '', '```ts', api.signature, '```'].filter(Boolean).join('\n')
    docs.push({
      id: `api:${api.symbol}`,
      boostText: api.symbol,
      text: body,
      payload: {
        kind: 'api',
        title: api.symbol,
        source: '@bloomskill/table-engine',
        body,
        pkg: 'engine',
      },
    })
  }

  for (const example of corpus.examples) {
    // Index the example's code so "how do I do X" can surface a working app,
    // but keep the rendered body short — `bst_get_example` returns the source.
    const code = example.files.map((f) => f.code).join('\n')
    docs.push({
      id: `example:${example.name}`,
      boostText: `${example.name} example`,
      text: `${example.description}\n${code}`,
      payload: {
        kind: 'example',
        title: `${example.name} (runnable example)`,
        source: `examples/${example.name}`,
        body: `${example.description}\n\nGet the full source with \`bst_get_example({ name: "${example.name}" })\`.`,
      },
    })
  }

  return new Bm25Index(docs)
}
