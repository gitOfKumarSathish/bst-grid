import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRepoRoot } from '../constants.js'
import { SCAFFOLD_FEATURES, scaffoldGrid, type ScaffoldFeature } from '../scaffold.js'
import type { BstCorpus } from '../types.js'
import { validateConfig } from '../validate.js'

const repoRoot = findRepoRoot(process.cwd())
const corpusPath = join(repoRoot ?? '', 'packages/mcp/dist/corpus.json')
const corpus: BstCorpus | undefined = existsSync(corpusPath)
  ? (JSON.parse(readFileSync(corpusPath, 'utf8')) as BstCorpus)
  : undefined

const describeCorpus = corpus ? describe : describe.skip

describeCorpus('scaffoldGrid', () => {
  const c = corpus as BstCorpus
  const build = (features: ScaffoldFeature[], adapter: 'mui' | 'shadcn' | 'engine' = 'mui') =>
    scaffoldGrid(c, {
      adapter,
      features,
      columns: [
        { id: 'name', editable: true },
        { id: 'age', type: 'number', editable: true },
      ],
    })

  it('emits the adapter import and the engine stylesheet', () => {
    const mui = build(['sorting'])
    expect(mui.code).toContain("import { BstTableMui } from '@bloomskill/table-mui'")
    expect(mui.code).toContain("import '@bloomskill/table-engine/styles.css'")

    const shadcn = build(['sorting'], 'shadcn')
    expect(shadcn.code).toContain("import { BstTableShadcn } from '@bloomskill/table-shadcn'")
    expect(shadcn.code).toContain("import '@bloomskill/table-shadcn/styles.css'")
  })

  it('types the columns with BstTableColumn and the generated row type', () => {
    const { code } = build(['sorting'])
    expect(code).toContain('const columns: BstTableColumn<Row>[]')
    expect(code).toContain("{ id: 'age', accessorKey: 'age', header: 'Age', meta: { type: 'number', editable: true } }")
  })

  it('adds the dependencies a capability needs but a developer forgets', () => {
    const editing = build(['editing'])
    expect(editing.code).toContain('getRowId={(row) => row.id}')
    expect(editing.code).toContain('onDataChange={setRows}')

    // Clipboard implies cell selection.
    expect(build(['clipboard']).code).toContain('enableCellSelection')

    // Batch editing must emit a single-call save handler.
    const batch = build(['batchEditing'])
    expect(batch.code).toContain("enableEditing={{ mode: 'batch' }}")
    expect(batch.code).toContain('onSave={handleSave}')
    expect(batch.code).toContain('BstSaveEvent<Row>')
  })

  it('gives option-based columns placeholder options rather than an empty column', () => {
    const result = scaffoldGrid(c, {
      adapter: 'mui',
      features: [],
      columns: [{ id: 'status', type: 'singleSelect' }],
    })
    expect(result.code).toContain('options: [')
    expect(result.notes.join(' ')).toContain('singleSelect')
  })

  it('derives the row field types from the cell types', () => {
    const { code } = scaffoldGrid(c, {
      adapter: 'engine',
      features: [],
      columns: [
        { id: 'tags', type: 'multiSelect' },
        { id: 'score', type: 'number' },
      ],
    })
    expect(code).toContain('tags: string[]')
    expect(code).toContain('score: number | null')
  })

  /**
   * The scaffolder and the validator must never disagree: every configuration
   * the one produces has to satisfy the other, or the server contradicts itself.
   */
  it('produces configurations its own validator accepts', () => {
    for (const feature of SCAFFOLD_FEATURES) {
      const { code } = build([feature])
      const report = validateConfig(c, code)
      const errors = report.findings.filter((f) => f.level === 'error')
      expect(errors, `scaffolding '${feature}' produced: ${errors.map((e) => e.message).join('; ')}`).toEqual([])
    }
  })

  it('produces a valid configuration with every capability at once', () => {
    const { code } = build([...SCAFFOLD_FEATURES])
    const report = validateConfig(c, code)
    expect(report.findings.filter((f) => f.level === 'error')).toEqual([])
  })
})
