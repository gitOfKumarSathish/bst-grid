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

  /**
   * Batch mode requested inline (`enableEditing={{ mode: 'batch' }}`) needs
   * `onSave` just as much as the `enableBatchEditing` flag does — the mode lives
   * in a string value, so it must be read before scrubbing.
   */
  it('warns on inline batch mode without onSave', () => {
    const missing = check("<BstTableMui getRowId={g} onDataChange={s} enableEditing={{ mode: 'batch' }} />")
    expect(missing.findings.some((f) => f.message.includes('onSave'))).toBe(true)
    // With onSave present, no such warning.
    const ok = check("<BstTableMui getRowId={g} onSave={save} enableEditing={{ mode: 'batch' }} />")
    expect(ok.findings.some((f) => f.message.includes('onSave'))).toBe(false)
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
    const report = check('<BstTableMui enableLiveUpdates onWebSocketUpdate={x} />')
    expect(report.ok).toBe(false)
    const finding = report.findings.find((f) => f.subject === 'I5')
    expect(finding?.message).toContain('NOT built')
    expect(finding?.fix).toContain('replacing')
  })

  /**
   * A prop that names a not-built capability yields ONE useful error (the spec
   * leaf + workaround), not the redundant pair of "unknown option" + "not built".
   * Regression guard for the README Quick-Start example.
   */
  it('reports an invented capability prop as a single spec-leaf error, not two', () => {
    const errors = check('{ enableLiveUpdates: true }').findings.filter((f) => f.level === 'error')
    expect(errors).toHaveLength(1)
    expect(errors[0]?.subject).toBe('I5')
    // The generic "not a Bst-Table option" error must be suppressed for it.
    expect(errors.some((f) => f.subject === 'enableLiveUpdates')).toBe(false)
  })

  /** The exact README Quick-Start example must yield exactly the two errors it documents. */
  it('matches the documented Quick-Start example (showSearch dep + I5)', () => {
    const report = check('{ showSearch: true, enableGlobalFilter: false, enableLiveUpdates: true }')
    const errorSubjects = report.findings.filter((f) => f.level === 'error').map((f) => f.subject).sort()
    expect(errorSubjects).toEqual(['I5', 'showSearch'])
  })

  /**
   * Virtualization is a REAL flag now (🟡 partial). It must NOT be flagged as an
   * unknown/not-built prop, and its sub-toggle dependency + yield-conflicts fire.
   */
  it('accepts enableVirtualization as a real flag and checks its rules', () => {
    const clean = check('<BstTableMui getRowId={g} enableVirtualization />')
    expect(clean.findings.some((f) => f.subject === 'enableVirtualization' && f.level === 'error')).toBe(false)
    expect(clean.findings.some((f) => f.subject === 'D1')).toBe(false)

    // Column virtualization needs row virtualization on.
    const sub = check('<BstTableMui getRowId={g} enableColumnVirtualization enableVirtualization={false} />')
    expect(sub.findings.some((f) => f.subject === 'enableColumnVirtualization' && f.level === 'error')).toBe(true)

    // It yields to grouping — surfaced as a warning, not a hard error.
    const yields = check('<BstTableMui getRowId={g} enableVirtualization enableGrouping />')
    expect(yields.findings.some((f) => f.subject === 'enableVirtualization' && f.message.includes('grouping'))).toBe(true)
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
