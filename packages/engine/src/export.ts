/**
 * Export (Phase 5, X1–X3) — **dependency-free** CSV / Excel (`.xlsx`) / print
 * builders. The core is pure and DOM-free (so it unit-tests in node): the runtime
 * gathers a {@link BstExportMatrix} from the grid — values formatted per cell type,
 * exactly like the clipboard — and these functions serialize it. Two DOM helpers
 * (`downloadBlob`, `printHtml`) trigger the browser download / print and are
 * guarded so SSR / jsdom simply no-op.
 *
 * Excel is a real OOXML `.xlsx`: a **store-only** (uncompressed) ZIP of minimal
 * SpreadsheetML, assembled here with a hand-rolled CRC-32 + ZIP writer, so **no
 * `exceljs` / `sheetjs` dependency** is pulled into the engine (matching the
 * repo's dep-free ethos — QR, barcode, charts and PDF preview are all dep-free
 * too). Numbers are emitted as typed numeric cells; everything else is an inline
 * string. Opens in Excel, LibreOffice and Google Sheets.
 */

/** One exported column — its header text and whether to type its values numerically. */
export interface BstExportColumn {
  /** Column id. */
  id: string
  /** Header text written to the first row (when headers are included). */
  header: string
  /** `true` (a `number` cell) → emit typed numeric Excel cells from the raw value. */
  numeric?: boolean
}

/**
 * The tabular payload every exporter serializes. `rows` holds display strings
 * (already formatted per cell type, so they match what the grid shows and what
 * copy/paste produces); `values` carries the parallel raw values, used only to
 * type numeric Excel cells.
 */
export interface BstExportMatrix {
  columns: BstExportColumn[]
  /** Display strings, row-major — `rows[r][c]` aligns with `columns[c]`. */
  rows: string[][]
  /** Raw values parallel to `rows` — used only for Excel numeric typing. */
  values?: unknown[][]
}

/** Options for {@link toCsv}. */
export interface CsvOptions {
  /** Field separator. Default `","`. */
  delimiter?: string
  /** Include the header row. Default `true`. */
  includeHeaders?: boolean
  /** Prepend a UTF-8 BOM so Excel opens non-ASCII correctly. Default `true`. */
  bom?: boolean
  /** Line terminator. Default `"\r\n"` (RFC 4180). */
  newline?: string
}

/** Options for {@link toXlsx}. */
export interface XlsxOptions {
  /** Include the header row (bold). Default `true`. */
  includeHeaders?: boolean
  /** Worksheet tab name. Default `"Sheet1"` (sanitised, ≤31 chars). */
  sheetName?: string
}

/** Options for {@link buildPrintHtml}. */
export interface PrintOptions {
  /** Document `<title>` + heading. Default `"Table"`. */
  title?: string
  /** Include the header row. Default `true`. */
  includeHeaders?: boolean
}

/** Which export formats a grid offers (X1–X3). */
export type BstExportFormat = 'csv' | 'excel' | 'print'

/** Row scope for an export — every filtered+sorted row (all pages) or just the current page. */
export type BstExportScope = 'all' | 'page'

/**
 * Customization for the `enableExport` toggle (passing an object implies enabled,
 * §12). The per-format fields (`csv`/`excel`/`print`) are ALSO exposed as the
 * top-level `enableCsvExport` / `enableExcelExport` / `enablePrint` settings-sheet
 * switches, which win over the matching field here.
 */
export interface BstExportOptions {
  /** Offer CSV. Default `true`. */
  csv?: boolean
  /** Offer Excel (`.xlsx`). Default `true`. */
  excel?: boolean
  /** Offer Print. Default `true`. */
  print?: boolean
  /** Base download file name (the extension is added per format). Default `"export"`. */
  fileName?: string
  /** Rows to export — `'all'` pages (default) or the current `'page'`. */
  scope?: BstExportScope
  /** Include the header row. Default `true`. */
  includeHeaders?: boolean
}

/** Per-call overrides for the `runtime.export*` methods (all optional). */
export interface BstExportRunOptions {
  /** Row scope for this call — overrides the configured default. */
  scope?: BstExportScope
  /** Base file name for this call — overrides the configured default. */
  fileName?: string
  /** Header inclusion for this call — overrides the configured default. */
  includeHeaders?: boolean
  /** CSV only — field delimiter. Default `","`. */
  delimiter?: string
}

/* ------------------------------------------------------------------ CSV */

function csvField(value: string, delim: string): string {
  const s = value == null ? '' : String(value)
  return s.includes(delim) || s.includes('"') || s.includes('\n') || s.includes('\r')
    ? '"' + s.replace(/"/g, '""') + '"'
    : s
}

/** Serialize a matrix to CSV (RFC 4180: `""`-escaped quotes, CRLF, optional BOM). */
export function toCsv(matrix: BstExportMatrix, opts: CsvOptions = {}): string {
  const delim = opts.delimiter ?? ','
  const nl = opts.newline ?? '\r\n'
  const lines: string[] = []
  if (opts.includeHeaders ?? true) {
    lines.push(matrix.columns.map((c) => csvField(c.header, delim)).join(delim))
  }
  for (const row of matrix.rows) lines.push(row.map((v) => csvField(v, delim)).join(delim))
  const body = lines.join(nl)
  return (opts.bom ?? true) ? '﻿' + body : body
}

/* ----------------------------------------------------------------- XLSX */

const enc = new TextEncoder()

/** Escape a string for an XML text node. */
function xmlText(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Escape a string for an XML attribute value. */
function xmlAttr(s: string): string {
  return xmlText(s).replace(/"/g, '&quot;')
}

/** Spreadsheet column letter for a 0-based index (0 → A, 26 → AA). */
function colLetter(i: number): string {
  let n = i + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// CRC-32 (IEEE 802.3) — table built once.
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

interface ZipEntry {
  name: string
  data: Uint8Array
}

/** Assemble entries into a **store-only** (method 0, uncompressed) ZIP archive. */
function zipStore(entries: ZipEntry[]): Uint8Array {
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  for (const e of entries) {
    const nameBytes = enc.encode(e.name)
    const crc = crc32(e.data)
    const size = e.data.length

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true) // local file header signature
    lv.setUint16(4, 20, true) // version needed to extract
    lv.setUint16(6, 0, true) // general purpose flags
    lv.setUint16(8, 0, true) // compression method: 0 = store
    lv.setUint16(10, 0, true) // mod file time
    lv.setUint16(12, 0x21, true) // mod file date (1980-01-01)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true) // compressed size
    lv.setUint32(22, size, true) // uncompressed size
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true) // extra field length
    local.set(nameBytes, 30)
    parts.push(local, e.data)

    const cen = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(cen.buffer)
    cv.setUint32(0, 0x02014b50, true) // central directory header signature
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0, true) // flags
    cv.setUint16(10, 0, true) // method
    cv.setUint16(12, 0, true) // time
    cv.setUint16(14, 0x21, true) // date
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true) // compressed size
    cv.setUint32(24, size, true) // uncompressed size
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true) // extra length
    cv.setUint16(32, 0, true) // comment length
    cv.setUint16(34, 0, true) // disk number start
    cv.setUint16(36, 0, true) // internal attrs
    cv.setUint32(38, 0, true) // external attrs
    cv.setUint32(42, offset, true) // local header offset
    cen.set(nameBytes, 46)
    central.push(cen)

    offset += local.length + size
  }

  const centralSize = central.reduce((a, b) => a + b.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true) // end of central directory signature
  ev.setUint16(4, 0, true) // disk number
  ev.setUint16(6, 0, true) // central dir start disk
  ev.setUint16(8, entries.length, true) // entries on this disk
  ev.setUint16(10, entries.length, true) // total entries
  ev.setUint32(12, centralSize, true) // central dir size
  ev.setUint32(16, offset, true) // central dir offset
  ev.setUint16(20, 0, true) // comment length

  const all = [...parts, ...central, eocd]
  const total = all.reduce((a, b) => a + b.length, 0)
  const out = new Uint8Array(total)
  let p = 0
  for (const chunk of all) {
    out.set(chunk, p)
    p += chunk.length
  }
  return out
}

const XLSX_CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>'

const XLSX_ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>'

const XLSX_WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>'

// Two cell formats: 0 = default, 1 = bold (for the header row).
const XLSX_STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
  '<fills count="1"><fill><patternFill patternType="none"/></fill></fills>' +
  '<borders count="1"><border/></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
  '</styleSheet>'

/** Serialize a matrix to a real OOXML `.xlsx` (store-only ZIP, no dependency). */
export function toXlsx(matrix: BstExportMatrix, opts: XlsxOptions = {}): Uint8Array {
  const includeHeaders = opts.includeHeaders ?? true
  const sheetName = (opts.sheetName ?? 'Sheet1').replace(/[\\/*?:[\]]/g, ' ').slice(0, 31) || 'Sheet1'
  const cols = matrix.columns

  const rowsXml: string[] = []
  let r = 1
  if (includeHeaders) {
    const cells = cols
      .map(
        (c, ci) =>
          `<c r="${colLetter(ci)}${r}" t="inlineStr" s="1"><is><t xml:space="preserve">${xmlText(c.header)}</t></is></c>`,
      )
      .join('')
    rowsXml.push(`<row r="${r}">${cells}</row>`)
    r++
  }
  for (let ri = 0; ri < matrix.rows.length; ri++, r++) {
    const disp = matrix.rows[ri]
    const raw = matrix.values?.[ri]
    const cells = cols
      .map((c, ci) => {
        const ref = `${colLetter(ci)}${r}`
        const rv = raw?.[ci]
        if (c.numeric && typeof rv === 'number' && Number.isFinite(rv)) {
          return `<c r="${ref}"><v>${rv}</v></c>`
        }
        const text = disp[ci] ?? ''
        return text === ''
          ? `<c r="${ref}"/>`
          : `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlText(text)}</t></is></c>`
      })
      .join('')
    rowsXml.push(`<row r="${r}">${cells}</row>`)
  }

  const sheetXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowsXml.join('')}</sheetData></worksheet>`

  const workbookXml =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${xmlAttr(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`

  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(XLSX_CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(XLSX_ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(XLSX_WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: enc.encode(XLSX_STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml) },
  ])
}

/* ---------------------------------------------------------------- print */

/** Build a standalone, print-friendly HTML document for the matrix. */
export function buildPrintHtml(matrix: BstExportMatrix, opts: PrintOptions = {}): string {
  const title = opts.title ?? 'Table'
  const thead =
    (opts.includeHeaders ?? true)
      ? `<thead><tr>${matrix.columns.map((c) => `<th>${xmlText(c.header)}</th>`).join('')}</tr></thead>`
      : ''
  const tbody =
    '<tbody>' +
    matrix.rows.map((row) => `<tr>${row.map((v) => `<td>${xmlText(v ?? '')}</td>`).join('')}</tr>`).join('') +
    '</tbody>'
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>' +
    xmlText(title) +
    '</title><style>' +
    'body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:24px;color:#111}' +
    'h1{font-size:16px;margin:0 0 12px}' +
    'table{border-collapse:collapse;width:100%;font-size:12px}' +
    'th,td{border:1px solid #ccc;padding:4px 8px;text-align:left;vertical-align:top}' +
    'thead th{background:#f3f4f6;font-weight:600}' +
    'tbody tr:nth-child(even) td{background:#fafafa}' +
    '@media print{body{margin:0}th,td{border-color:#999}}' +
    '</style></head><body><h1>' +
    xmlText(title) +
    '</h1><table>' +
    thead +
    tbody +
    '</table></body></html>'
  )
}

/* ------------------------------------------------------------ DOM glue */

/** MIME types for the three export formats. */
export const EXPORT_MIME = {
  csv: 'text/csv;charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  html: 'text/html;charset=utf-8',
} as const

/** Ensure `name` ends with `.ext` (case-insensitive), appending if missing. */
export function ensureExtension(name: string, ext: string): string {
  const suffix = '.' + ext
  return name.toLowerCase().endsWith(suffix.toLowerCase()) ? name : name + suffix
}

/**
 * Trigger a browser download of `data` as `fileName`. No-ops under SSR / jsdom
 * (no `document` / `URL.createObjectURL`), so callers never need to guard.
 */
export function downloadBlob(fileName: string, mime: string, data: string | Uint8Array): void {
  if (
    typeof document === 'undefined' ||
    typeof URL === 'undefined' ||
    typeof URL.createObjectURL !== 'function'
  ) {
    return
  }
  const blob = new Blob([data as BlobPart], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * Open `html` in a print view and invoke the browser print dialog. Prefers a new
 * window (self-contained, doesn't touch the host DOM); falls back to a hidden
 * iframe when a popup is blocked. No-ops under SSR / jsdom.
 */
export function printHtml(html: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  let w: Window | null = null
  try {
    w = window.open('', '_blank')
  } catch {
    w = null
  }
  if (w) {
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => {
      try {
        w?.print()
      } catch {
        /* print unavailable */
      }
    }, 150)
    return
  }
  // Popup blocked → hidden iframe fallback.
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  document.body.appendChild(iframe)
  const doc = iframe.contentWindow?.document
  if (!doc) {
    document.body.removeChild(iframe)
    return
  }
  doc.open()
  doc.write(html)
  doc.close()
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } catch {
      /* print unavailable */
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe)
    }, 1000)
  }, 200)
}
