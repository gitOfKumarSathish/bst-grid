/**
 * A small BM25 ranker over the generated corpus.
 *
 * Hand-rolled rather than pulled from npm: the corpus is ~75 doc chunks plus a
 * few hundred short records, where BM25 is comfortably enough, and the MCP
 * package stays at two runtime dependencies (SDK + zod) with no index artifact,
 * no embedding model and no network call at query time.
 */

/** Standard BM25 term-frequency saturation. */
const K1 = 1.2
/** Standard BM25 length normalisation. */
const B = 0.75

/** A document as fed to the index. `boostText` is matched at a higher weight. */
export interface IndexDoc<T> {
  id: string
  /** Title-ish text (heading path, flag name) — weighted above the body. */
  boostText: string
  /** The full body text. */
  text: string
  /** Whatever the caller wants back on a hit. */
  payload: T
}

/** A scored hit. */
export interface Hit<T> {
  id: string
  score: number
  payload: T
}

/** How much more a term in `boostText` counts than one in `text`. */
const BOOST_WEIGHT = 3

/**
 * Splits text into lowercase terms. Identifiers are indexed **both** whole and
 * split on camelCase/dots, so `enableColumnFilters` is found by "column filter"
 * and `meta.rowSpan` by "row span" — the way people actually ask.
 */
export function tokenize(text: string): string[] {
  const out: string[] = []
  for (const raw of text.toLowerCase().match(/[a-z0-9_$.]+/g) ?? []) {
    out.push(raw)
    const parts = raw.split(/[._]+/).filter(Boolean)
    if (parts.length > 1) out.push(...parts)
  }
  // camelCase splitting needs the original casing.
  for (const raw of text.match(/[A-Za-z][A-Za-z0-9]*/g) ?? []) {
    const parts = raw.split(/(?<=[a-z0-9])(?=[A-Z])/)
    if (parts.length > 1) out.push(...parts.map((p) => p.toLowerCase()))
  }
  return out.filter((t) => t.length > 1)
}

interface Entry<T> {
  id: string
  payload: T
  /** term → weighted count */
  freq: Map<string, number>
  length: number
}

/** An in-memory BM25 index. Built once at server start; queries are pure reads. */
export class Bm25Index<T> {
  private readonly entries: Entry<T>[] = []
  private readonly docFreq = new Map<string, number>()
  private avgLength = 0

  constructor(docs: Array<IndexDoc<T>>) {
    for (const doc of docs) {
      const freq = new Map<string, number>()
      let length = 0

      const add = (text: string, weight: number): void => {
        for (const term of tokenize(text)) {
          freq.set(term, (freq.get(term) ?? 0) + weight)
          length += weight
        }
      }
      add(doc.boostText, BOOST_WEIGHT)
      add(doc.text, 1)

      for (const term of freq.keys()) this.docFreq.set(term, (this.docFreq.get(term) ?? 0) + 1)
      this.entries.push({ id: doc.id, payload: doc.payload, freq, length })
    }

    const total = this.entries.reduce((sum, e) => sum + e.length, 0)
    this.avgLength = this.entries.length ? total / this.entries.length : 0
  }

  /** Ranks documents against `query`, best first. Zero-scoring docs are dropped. */
  search(query: string, limit: number): Array<Hit<T>> {
    const terms = tokenize(query)
    if (!terms.length || !this.entries.length) return []

    const n = this.entries.length
    const hits: Array<Hit<T>> = []

    for (const entry of this.entries) {
      let score = 0
      for (const term of terms) {
        const tf = entry.freq.get(term)
        if (!tf) continue
        const df = this.docFreq.get(term) ?? 0
        // BM25 IDF, floored at 0 so a term in nearly every doc can't score negative.
        const idf = Math.max(0, Math.log(1 + (n - df + 0.5) / (df + 0.5)))
        const norm = tf * (K1 + 1)
        const denom = tf + K1 * (1 - B + (B * entry.length) / (this.avgLength || 1))
        score += idf * (norm / denom)
      }
      if (score > 0) hits.push({ id: entry.id, score, payload: entry.payload })
    }

    return hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, limit)
  }
}
