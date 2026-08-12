import * as React from 'react'
import { defineCellType } from '../registry/registry.js'
import type { CellType, CellEditProps, BstColumnMeta } from '../registry/types.js'
import { qrMatrix, type QrEcLevel } from './qr.js'
import { code128 } from './barcode.js'
import { htmlToText, sanitizeHtml, escapeHtml, isRichTextEmpty } from './richtext.js'

/* --------------------------------------------------------------- QR (B1) */

function QrCell({ value, meta }: { value: unknown; meta: BstColumnMeta }) {
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const text = value == null ? '' : String(value)
  if (!text) return <span className="bst-cell-muted">—</span>
  let m
  try {
    m = qrMatrix(text, (cm.ecLevel ?? 'M') as QrEcLevel)
  } catch {
    return (
      <span className="bst-cell-muted" title={text}>
        QR too long
      </span>
    )
  }
  const margin = cm.margin ?? 2
  const dim = m.size + margin * 2
  const px = cm.size ?? 88
  let d = ''
  for (let r = 0; r < m.size; r++)
    for (let c = 0; c < m.size; c++)
      if (m.modules[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`
  return (
    <span className="bst-cell-qr" title={text}>
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${dim} ${dim}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`QR code: ${text}`}
      >
        <rect width={dim} height={dim} fill="#fff" />
        <path d={d} fill="#000" />
      </svg>
    </span>
  )
}

export const qrCellType: CellType<string> = defineCellType<string>({
  id: 'qr',
  renderRead: ({ value, meta }) => <QrCell value={value} meta={meta} />,
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => (
    <input
      className="bst-input"
      autoFocus={autoFocus}
      value={draft ?? ''}
      placeholder={meta.placeholder}
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
  format: (v) => (v == null ? '' : String(v)),
  parse: (raw) => raw,
  isEmpty: (v) => v == null || String(v).trim() === '',
})

/* --------------------------------------------------------- Barcode (B1) */

function BarcodeCell({ value, meta }: { value: unknown; meta: BstColumnMeta }) {
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const text = value == null ? '' : String(value)
  if (!text) return <span className="bst-cell-muted">—</span>
  let res
  try {
    res = code128(text)
  } catch {
    return (
      <span className="bst-cell-muted" title={text}>
        invalid
      </span>
    )
  }
  const height = cm.height ?? 38
  const quiet = 10
  const showText = cm.showText !== false
  const textH = showText ? 13 : 0
  let total = quiet * 2
  for (const ch of res.pattern) total += Number(ch)
  const rects: React.ReactNode[] = []
  let x = quiet
  let bar = true
  let i = 0
  for (const ch of res.pattern) {
    const w = Number(ch)
    if (bar) rects.push(<rect key={i} x={x} y={0} width={w} height={height} fill="#000" />)
    x += w
    bar = !bar
    i++
  }
  return (
    <span className="bst-cell-barcode" title={text}>
      <svg
        className="bst-barcode-svg"
        width={total}
        height={height + textH}
        viewBox={`0 0 ${total} ${height + textH}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={`Barcode: ${text}`}
      >
        <rect width={total} height={height + textH} fill="#fff" />
        {rects}
        {showText ? (
          <text
            x={total / 2}
            y={height + 10}
            textAnchor="middle"
            fontSize="10"
            fontFamily="monospace"
            fill="#000"
          >
            {text}
          </text>
        ) : null}
      </svg>
    </span>
  )
}

export const barcodeCellType: CellType<string> = defineCellType<string>({
  id: 'barcode',
  renderRead: ({ value, meta }) => <BarcodeCell value={value} meta={meta} />,
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => (
    <input
      className="bst-input"
      autoFocus={autoFocus}
      value={draft ?? ''}
      placeholder={meta.placeholder}
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
  format: (v) => (v == null ? '' : String(v)),
  parse: (raw) => raw,
  isEmpty: (v) => v == null || String(v).trim() === '',
})

/* ------------------------------------------------------- Rich text (J2) */

function RichTextCell({ value, meta }: { value: unknown; meta: BstColumnMeta }) {
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const text = htmlToText(value)
  // `cellMeta.render: 'html'` shows the value **formatted** (bold / lists / …),
  // rendering the *sanitized* HTML (XSS-safe via the allow-list sanitizer). The
  // default 'text' shows a safe one-line plain-text preview.
  if (cm.render === 'html' && text !== '') {
    return (
      <span
        className="bst-cell-richtext bst-cell-richtext-html"
        title={text}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
      />
    )
  }
  return (
    <span className="bst-cell-richtext" title={text || undefined}>
      {text}
    </span>
  )
}

/**
 * Neutral inline rich-text editor: a `contentEditable` surface + a small toolbar
 * (bold / italic / underline / lists). Self-commits on blur with the value run
 * through `sanitizeHtml` (allow-list), so no unsafe markup is stored. Adapters
 * override this with a popup (dialog) version.
 */
export function RichTextEditor({ draft, commit, cancel, autoFocus }: CellEditProps<any, string>) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = sanitizeHtml(draft ?? '')
    if (autoFocus) el.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const exec = (cmd: string) => {
    document.execCommand(cmd, false)
    ref.current?.focus()
  }
  const btn = (cmd: string, label: React.ReactNode, title: string) => (
    <button
      type="button"
      className="bst-richtext-btn"
      title={title}
      aria-label={title}
      onMouseDown={(e) => {
        e.preventDefault()
        exec(cmd)
      }}
    >
      {label}
    </button>
  )
  return (
    <div className="bst-richtext-editor">
      <div className="bst-richtext-toolbar" role="toolbar" aria-label="Text formatting">
        {btn('bold', <b>B</b>, 'Bold')}
        {btn('italic', <i>I</i>, 'Italic')}
        {btn('underline', <u>U</u>, 'Underline')}
        {btn('insertUnorderedList', '•', 'Bulleted list')}
        {btn('insertOrderedList', '1.', 'Numbered list')}
      </div>
      <div
        ref={ref}
        className="bst-input bst-richtext-area"
        contentEditable
        role="textbox"
        aria-multiline="true"
        onBlur={() => commit(sanitizeHtml(ref.current?.innerHTML ?? ''))}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            cancel()
          }
        }}
      />
    </div>
  )
}

export const richTextCellType: CellType<string> = defineCellType<string>({
  id: 'richText',
  editMode: 'inline',
  // Opt out of the host's blur-commit (the editor self-commits) and its
  // Enter-commit (Enter should insert a newline in the editable, not save).
  overlayEditor: true,
  capturesArrowKeys: true,
  renderRead: ({ value, meta }) => <RichTextCell value={value} meta={meta} />,
  renderEdit: (p) => <RichTextEditor {...(p as CellEditProps<any, string>)} />,
  format: (v) => htmlToText(v),
  parse: (raw) => escapeHtml(raw),
  isEmpty: (v) => isRichTextEmpty(v),
})

/** The three deferred cell types (B1 QR/barcode, J2 rich text). */
export const advancedCellTypes = [qrCellType, barcodeCellType, richTextCellType]
