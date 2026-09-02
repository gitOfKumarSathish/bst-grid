import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildAgentPrompt } from '../agent-prompt.js'
import { findRepoRoot } from '../constants.js'
import type { BstCorpus } from '../types.js'

const repoRoot = findRepoRoot(process.cwd())
const corpusPath = join(repoRoot ?? '', 'packages/mcp/dist/corpus.json')
const corpus: BstCorpus | undefined = existsSync(corpusPath)
  ? (JSON.parse(readFileSync(corpusPath, 'utf8')) as BstCorpus)
  : undefined

const describeCorpus = corpus ? describe : describe.skip

/**
 * The agent prompt is the one artifact whose whole job is to stop a model
 * inventing API. So it gets the parity guard the settings sheet and the rule
 * table already have, in both directions: it must name every real flag, and it
 * must not name anything else.
 */
describeCorpus('agent prompt', () => {
  const c = corpus as BstCorpus
  const prompt = buildAgentPrompt(c)
  const toggles = c.features.filter((f) => f.kind === 'toggle' && f.flag)
  /** Identifiers the prompt presents as Bst-Table props. */
  const flagsNamed = new Set(prompt.match(/\b(?:enable|show)[A-Z]\w*/g) ?? [])

  it('lists every toggle the release actually ships', () => {
    const missing = [...new Set(toggles.map((f) => f.flag))].filter((flag) => !prompt.includes(flag))
    expect(missing, `flags missing from the agent prompt: ${missing.join(', ')}`).toEqual([])
  })

  it('names no flag that does not exist', () => {
    const real = new Set(c.features.flatMap((f) => [f.flag, ...(f.related ?? [])]))
    const invented = [...flagsNamed].filter((flag) => !real.has(flag))
    expect(invented, `the prompt names flags absent from the corpus: ${invented.join(', ')}`).toEqual([])
  })

  it('names no cell type that does not exist', () => {
    const real = new Set(c.cellTypes.map((ct) => ct.type))
    const section = prompt.split('## 5.')[1]?.split('## 6.')[0] ?? ''
    const listed = [...section.matchAll(/`(\w+)`/g)].map((m) => m[1]).filter((w) => /^[a-z]/.test(w))
    const unknown = listed.filter(
      (t) => !real.has(t) && !['defineCellType', 'cellTypes', 'columnDef', 'cell'].includes(t),
    )
    expect(unknown, `unknown cell types in §5: ${unknown.join(', ')}`).toEqual([])
  })

  it('lists each flag once, so a mode row cannot shadow its base flag', () => {
    // `enableEditing: { mode: 'batch' }` is a second §12 row for `enableEditing`;
    // the flag must appear once in the §6 listing, not twice.
    const listing = prompt.split('Engine behaviour')[1]?.split('Adapter chrome')[0] ?? ''
    const occurrences = (listing.match(/\benableEditing\b/g) ?? []).length
    expect(occurrences).toBe(1)
  })

  it('is pinned to the corpus version', () => {
    expect(prompt).toContain(`v${c.version}`)
    expect(prompt).toContain(`@bloomskill/table-engine@${c.version}`)
  })

  it('marks default-on flags and leaves opt-in ones unmarked', () => {
    expect(prompt).toMatch(/enableSorting\*/)
    expect(prompt).not.toMatch(/enableEditing\*/)
  })

  it('states the open coverage gaps rather than implying full support', () => {
    for (const gap of c.requirements.filter((r) => r.status !== 'built')) {
      expect(prompt).toContain(gap.id)
    }
  })

  it('takes a site override for the lookup links', () => {
    expect(buildAgentPrompt(c, { site: 'https://example.test/' })).toContain(
      'https://example.test/llms.txt',
    )
  })
})
