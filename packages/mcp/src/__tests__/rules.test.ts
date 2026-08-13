import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findRepoRoot } from '../constants.js'
import { OPTION_REQUIRES, RULES } from '../rules.js'
import type { BstCorpus } from '../types.js'
import { detectProps, validateConfig } from '../validate.js'

const repoRoot = findRepoRoot(process.cwd())
const corpusPath = join(repoRoot ?? '', 'packages/mcp/dist/corpus.json')
const corpus: BstCorpus | undefined = existsSync(corpusPath)
  ? (JSON.parse(readFileSync(corpusPath, 'utf8')) as BstCorpus)
  : undefined

const describeCorpus = corpus ? describe : describe.skip

describe('prop detection', () => {
  const known = ['enableEditing', 'enableClipboard', 'showSearch', 'enableGlobalFilter', 'pagination']

  it('reads bare JSX attributes as on', () => {
    const found = detectProps('<BstTableMui showSearch />', known)
    expect(found.get('showSearch')?.effective).toBe(true)
  })

  it('reads explicit false in both JSX and object syntax', () => {
    expect(detectProps('<X enableGlobalFilter={false} />', known).get('enableGlobalFilter')?.effective).toBe(false)
    expect(detectProps('useBstTable({ enableGlobalFilter: false })', known).get('enableGlobalFilter')?.effective).toBe(false)
  })

  it('reads an options object as on', () => {
    expect(detectProps("<X enableEditing={{ mode: 'batch' }} />", known).get('enableEditing')?.effective).toBe(true)
  })

  it('does not match a prop inside a longer identifier', () => {
    expect(detectProps('<X myEnableEditingThing />', known).has('enableEditing')).toBe(false)
  })
})

describeCorpus('rule table', () => {
  const c = corpus as BstCorpus

  /**
   * THE parity guard for the one hand-authored part of this server. Adding a
   * Bst-Table toggle fails this test until a rule is registered — mirroring the
   * compile-time check `engine/src/settings.ts` applies to the settings sheet.
   */
  it('has an entry for every lintable toggle in the corpus', () => {
    const toggles = c.features.filter((f) => f.kind === 'toggle').map((f) => f.flag)
    const missing = [...new Set(toggles)].filter((flag) => !(flag in RULES))
    expect(missing).toEqual([])
  })

  it('only references flags that actually exist', () => {
    const known = new Set(c.features.map((f) => f.flag))
    const referenced = new Set<string>()
    for (const rule of Object.values(RULES)) {
      for (const flag of [...(rule.requires ?? []), ...(rule.implies ?? [])]) referenced.add(flag)
      for (const conflict of rule.conflictsWith ?? []) referenced.add(conflict.flag)
    }
    for (const req of Object.values(OPTION_REQUIRES)) referenced.add(req.flag)
    expect([...referenced].filter((f) => !known.has(f))).toEqual([])
  })
})

describeCorpus('validateConfig', () => {
  const c = corpus as BstCorpus
  const check = (code: string) => validateConfig(c, code)
  const subjects = (code: string, level: string) =>
    check(code)
      .findings.filter((f) => f.level === level)
      .map((f) => f.subject)

  it('flags chrome whose behaviour flag is switched off', () => {
    const report = check('<BstTableMui data={r} columns={c} showSearch enableGlobalFilter={false} />')
    expect(report.ok).toBe(false)
    expect(subjects(report.findings.length ? '<BstTableMui showSearch enableGlobalFilter={false} />' : '', 'error')).toContain('showSearch')
  })

  it('accepts chrome whose behaviour flag defaults on', () => {
    // enableGlobalFilter defaults to true, so showSearch alone is correct.
    const report = check('<BstTableMui data={r} columns={c} getRowId={g} showSearch />')
    expect(report.findings.filter((f) => f.subject === 'showSearch' && f.level === 'error')).toEqual([])
  })

  it('requires getRowId whenever editing or selection is on', () => {
    expect(subjects('<BstTableMui enableEditing onDataChange={set} />', 'error')).toContain('getRowId')
    expect(subjects('<BstTableMui enableRowSelection />', 'error')).toContain('getRowId')
    expect(subjects('<BstTableMui enableEditing onDataChange={set} getRowId={g} />', 'error')).not.toContain('getRowId')
  })

  it('reports that clipboard implies cell selection', () => {
    const infos = check('<BstTableMui enableClipboard />').findings.filter((f) => f.level === 'info')
    expect(infos.some((f) => f.message.includes('enableCellSelection'))).toBe(true)
  })

  it('warns when batch editing has no onSave to persist through', () => {
    const report = check('<BstTableMui enableBatchEditing enableEditing getRowId={g} onDataChange={set} />')
    expect(report.findings.some((f) => f.subject === 'enableBatchEditing' && f.message.includes('onSave'))).toBe(true)
  })

  it('rejects props Bst-Table does not have', () => {
    const report = check('<BstTableMui enableRangeSelection showSidebar />')
    expect(report.ok).toBe(false)
    expect(subjects('<BstTableMui enableRangeSelection showSidebar />', 'error')).toEqual(
      expect.arrayContaining(['enableRangeSelection', 'showSidebar']),
    )
  })

  /** The anti-hallucination path: asking for what doesn't exist must be refused. */
  it('refuses capabilities that are not built, citing the spec leaf', () => {
    const report = check('<BstTableMui enableVirtualization rowVirtualizer={v} />')
    expect(report.ok).toBe(false)
    const finding = report.findings.find((f) => f.subject === 'D1')
    expect(finding?.message).toContain('NOT built')
    expect(finding?.fix).toContain('useBstDataSource')
  })

  it('requires a row count when paginating server-side', () => {
    expect(subjects('<BstTableMui manualPagination data={page} />', 'error')).toContain('manualPagination')
    expect(subjects('<BstTableMui manualPagination rowCount={total} data={page} />', 'error')).not.toContain(
      'manualPagination',
    )
  })

  it('flags options that are inert without their flag', () => {
    expect(subjects('<BstTableMui renderDetail={d} enableExpanding={false} />', 'error')).toContain('renderDetail')
  })

  it('passes a correct configuration', () => {
    const report = check(`
      <BstTableMui
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        onDataChange={setRows}
        enableEditing
        enableCellSelection
        enableClipboard
        showSearch
      />
    `)
    expect(report.ok).toBe(true)
  })
})
