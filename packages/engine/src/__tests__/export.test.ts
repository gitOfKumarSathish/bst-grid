import { describe, test, expect } from 'vitest'
import {
  createRuntime,
  createDefaultRegistry,
  toCsv,
  toXlsx,
  buildPrintHtml,
  ensureExtension,
} from '../index'
import type { BstColumnMeta, RuntimeCtx, BstExportMatrix } from '../index'

/* --------------------------------------------------------- pure serializers */

describe('export — CSV serializer', () => {
  test('RFC-4180 escaping (delimiter / quote / newline) + CRLF + BOM', () => {
    const m: BstExportMatrix = {
      columns: [
        { id: 'a', header: 'A' },
        { id: 'b', header: 'B,x' },
      ],
      rows: [
        ['plain', 'has,comma'],
        ['has "quote"', 'line\nbreak'],
      ],
    }
    expect(toCsv(m, { bom: false })).toBe(
      'A,"B,x"\r\nplain,"has,comma"\r\n"has ""quote""","line\nbreak"',
    )
    // BOM on by default (so Excel reads UTF-8), suppressible.
    expect(toCsv(m).startsWith('﻿')).toBe(true)
    expect(toCsv(m, { bom: false }).startsWith('﻿')).toBe(false)
    // Header row toggle + custom delimiter.
    expect(toCsv(m, { includeHeaders: false, bom: false }).startsWith('plain')).toBe(true)
    expect(toCsv(m, { delimiter: ';', bom: false }).split('\r\n')[0]).toBe('A;B,x')
  })
})

describe('export — XLSX serializer', () => {
  test('is a store-only ZIP with the OOXML parts + typed cells', () => {
    const m: BstExportMatrix = {
      columns: [
        { id: 'name', header: 'Name' },
        { id: 'age', header: 'Age', numeric: true },
      ],
      rows: [
        ['Alice', '30'],
        ['Bob', '25'],
      ],
      values: [
        ['Alice', 30],
        ['Bob', 25],
      ],
    }
    const bytes = toXlsx(m)
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    // Local file header signature at the start, end-of-central-directory at the tail.
    expect(dv.getUint32(0, true)).toBe(0x04034b50)
    expect(dv.getUint32(bytes.length - 22, true)).toBe(0x06054b50)
    const text = new TextDecoder().decode(bytes)
    expect(text).toContain('[Content_Types].xml')
    expect(text).toContain('xl/worksheets/sheet1.xml')
    expect(text).toContain('<worksheet')
    expect(text).toContain('Alice') // inline string cell
    expect(text).toContain('<v>30</v>') // typed numeric cell (not a string)
  })

  test('a null/empty display value becomes an empty cell, not a string', () => {
    const bytes = toXlsx({
      columns: [{ id: 'a', header: 'A' }],
      rows: [['']],
      values: [[null]],
    })
    expect(new TextDecoder().decode(bytes)).toContain('<c r="A2"/>')
  })
})

describe('export — print HTML', () => {
  test('builds an escaped, standalone table document', () => {
    const html = buildPrintHtml(
      { columns: [{ id: 'a', header: 'A<b>' }], rows: [['x&y'], ['<z>']] },
      { title: 'Rep<ort' },
    )
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<table>')
    expect(html).toContain('A&lt;b&gt;') // header escaped
    expect(html).toContain('x&amp;y') // cell escaped
    expect(html).toContain('Rep&lt;ort') // title escaped
    expect(html).not.toContain('<b>') // never raw markup from data
  })
})

describe('export — ensureExtension', () => {
  test('appends only when the extension is missing (case-insensitive)', () => {
    expect(ensureExtension('report', 'csv')).toBe('report.csv')
    expect(ensureExtension('report.csv', 'csv')).toBe('report.csv')
    expect(ensureExtension('report.CSV', 'csv')).toBe('report.CSV')
  })
})

/* ------------------------------------------------------------- runtime glue */

type Row = { id: string; name: string; age: number | null }

function makeRuntime(
  o: {
    enableExport?: boolean
    enableCsvExport?: boolean
    enableExcelExport?: boolean
    enablePrint?: boolean
    exportScope?: 'all' | 'page'
  } = {},
) {
  const data: Row[] = [
    { id: '1', name: 'Alice', age: 30 },
    { id: '2', name: 'Bob, Jr', age: 25 },
    { id: '3', name: 'Cara', age: null },
  ]
  const registry = createDefaultRegistry()
  const getRowId = (r: Row, i: number) => r.id ?? String(i)
  const columnIds = ['name', 'age', 'acts']
  const meta: Record<string, BstColumnMeta<Row>> = {
    name: { type: 'text' },
    age: { type: 'number' },
    acts: { type: 'action' },
  }
  const ctx = {
    registry,
    data,
    rowIndexById: new Map(data.map((r, i) => [getRowId(r, i), i])),
    getRowId,
    metaByColumn: new Map(columnIds.map((id) => [id, meta[id]])),
    fieldByColumn: new Map(columnIds.map((id) => [id, id])),
    headerByColumn: new Map([
      ['name', 'Full Name'],
      ['age', 'Age'],
      ['acts', 'Actions'],
    ]),
    columnIds,
    // page 1 shows rows 1–2; all pages = rows 1–3.
    visibleRowIds: ['1', '2'],
    allRowIds: ['1', '2', '3'],
    visibleColumnIds: columnIds,
    rowVisualIndex: new Map(),
    colVisualIndex: new Map(),
    enableEditing: false,
    enableValidation: false,
    enableCellSelection: false,
    enableClipboard: false,
    enableUndoRedo: false,
    policy: 'blockCommitOnError',
    saveOn: [],
    batchEditing: false,
    gridDisabled: false,
    tempIdPrefix: 'tmp_',
    enableExport: o.enableExport ?? true,
    enableCsvExport: o.enableCsvExport ?? true,
    enableExcelExport: o.enableExcelExport ?? true,
    enablePrint: o.enablePrint ?? true,
    exportFileName: 'people',
    exportScope: o.exportScope ?? 'all',
    exportIncludeHeaders: true,
  } as unknown as RuntimeCtx<Row>
  return createRuntime<Row>(ctx)
}

describe('export — runtime.getExportMatrix', () => {
  test('all-pages scope, skips action columns, uses headers', () => {
    const m = makeRuntime().getExportMatrix()
    expect(m.columns.map((c) => c.id)).toEqual(['name', 'age']) // 'acts' (action) dropped
    expect(m.columns.map((c) => c.header)).toEqual(['Full Name', 'Age'])
    expect(m.columns[1].numeric).toBe(true) // number cell → numeric
    expect(m.rows.length).toBe(3) // every page, not just the visible one
    expect(m.rows[0][0]).toBe('Alice')
  })

  test('page scope exports only the visible page; per-call override wins', () => {
    const rt = makeRuntime({ exportScope: 'page' })
    expect(rt.getExportMatrix().rows.length).toBe(2)
    expect(rt.getExportMatrix({ scope: 'all' }).rows.length).toBe(3)
  })
})

describe('export — runtime formats', () => {
  test('exportCsv returns header + all rows with a BOM', () => {
    const csv = makeRuntime().exportCsv()
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('Full Name,Age')
    expect(csv).toContain('Alice')
    // "Bob, Jr" contains the delimiter → must be quoted.
    expect(csv).toContain('"Bob, Jr"')
  })

  test('exportExcel returns a valid xlsx byte stream', () => {
    const bytes = makeRuntime().exportExcel()
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    expect(dv.getUint32(0, true)).toBe(0x04034b50)
    expect(new TextDecoder().decode(bytes)).toContain('Alice')
  })

  test('printTable returns standalone HTML for the grid', () => {
    expect(makeRuntime().printTable()).toContain('<table>')
  })
})

describe('export — gating', () => {
  test('master off → every format no-ops', () => {
    const rt = makeRuntime({ enableExport: false })
    expect(rt.exportCsv()).toBe('')
    expect(rt.exportExcel().length).toBe(0)
    expect(rt.printTable()).toBe('')
  })

  test('a single format can be switched off without affecting the others', () => {
    expect(makeRuntime({ enableCsvExport: false }).exportCsv()).toBe('')
    expect(makeRuntime({ enableCsvExport: false }).exportExcel().length).toBeGreaterThan(0)
    expect(makeRuntime({ enableExcelExport: false }).exportExcel().length).toBe(0)
    expect(makeRuntime({ enablePrint: false }).printTable()).toBe('')
  })
})
