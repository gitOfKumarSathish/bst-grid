import * as React from 'react'
import type {
  BstCellApi,
  BstColumnMeta,
  BstOption,
  CellEditProps,
  CellType,
  FieldError,
} from './types.js'
import { createCellTypeRegistry, defineCellType } from './registry.js'
import type { CellTypeRegistry } from './registry.js'
import { useBstIcons } from '../icons.js'
import type { BstIcons } from '../icons.js'
import { qrCellType, barcodeCellType, richTextCellType } from '../cells/celltypes.js'
import { resolveFieldFormat } from '../cells/formats.js'
import type { FieldFormat } from '../cells/formats.js'

/* ------------------------------------------------------------------ helpers */

function asString(v: unknown): string {
  return v == null ? '' : String(v)
}

function toNumber(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isNaN(n) ? null : n
}

function numberFormat(v: unknown, meta: BstColumnMeta): string {
  const n = toNumber(v)
  if (n == null) return ''
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const shorthand = typeof meta.format === 'string' ? meta.format : undefined
  const opts: Intl.NumberFormatOptions =
    meta.format && typeof meta.format === 'object' ? { ...(meta.format as object) } : {}
  if (shorthand === 'currency' || cm.currency) {
    opts.style = 'currency'
    opts.currency = cm.currency ?? 'USD'
  } else if (shorthand === 'percent') {
    opts.style = 'percent'
  }
  if (cm.precision != null) {
    opts.minimumFractionDigits = cm.precision
    opts.maximumFractionDigits = cm.precision
  }
  if (cm.useGrouping != null) opts.useGrouping = cm.useGrouping
  try {
    return new Intl.NumberFormat(meta.locale, opts).format(n)
  } catch {
    return String(n)
  }
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.\-eE]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return null
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

function toDate(v: unknown): Date | null {
  if (v == null || v === '') return null
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v
  if (typeof v === 'string' && /^\d{2}:\d{2}/.test(v)) {
    const d = new Date('1970-01-01T' + v)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const d = new Date(v as string | number)
  return Number.isNaN(d.getTime()) ? null : d
}

type DateVariant = 'date' | 'time' | 'dateTime'

function dateVariant(meta: BstColumnMeta): DateVariant {
  return ((meta.cellMeta ?? {}) as Record<string, any>).variant ?? 'date'
}

function dateFormat(v: unknown, meta: BstColumnMeta): string {
  const d = toDate(v)
  if (!d) return ''
  const variant = dateVariant(meta)
  const opts: Intl.DateTimeFormatOptions =
    meta.format && typeof meta.format === 'object'
      ? { ...(meta.format as object) }
      : variant === 'time'
        ? { hour: '2-digit', minute: '2-digit' }
        : variant === 'dateTime'
          ? {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }
          : { year: 'numeric', month: 'short', day: 'numeric' }
  try {
    return new Intl.DateTimeFormat(meta.locale, opts).format(d)
  } catch {
    return d.toISOString()
  }
}

function toDateInputValue(value: unknown, variant: DateVariant): string {
  if (variant === 'time') {
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5)
    const d = toDate(value)
    return d ? d.toISOString().slice(11, 16) : ''
  }
  const d = toDate(value)
  if (!d) return ''
  return variant === 'dateTime' ? d.toISOString().slice(0, 16) : d.toISOString().slice(0, 10)
}

function fromDateInputValue(raw: string, variant: DateVariant): string | null {
  if (!raw) return null
  if (variant === 'time') return raw
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

function findOption(meta: BstColumnMeta, value: unknown): BstOption | undefined {
  return meta.options?.find((o) => o.value === value)
}

function normalizeLink(value: unknown): { href: string; label: string } {
  if (value && typeof value === 'object') {
    const v = value as { href?: string; url?: string; label?: string; text?: string }
    const href = v.href ?? v.url ?? ''
    return { href, label: v.label ?? v.text ?? href }
  }
  const s = asString(value)
  return { href: s, label: s }
}

interface FileRefLike {
  name?: string
  url?: string
  thumbnailUrl?: string
  contentType?: string
}

function normalizeFiles(value: unknown): FileRefLike[] {
  if (value == null || value === '') return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map((f) => (typeof f === 'string' ? { name: f, url: f } : (f as FileRefLike)))
}

function isImageFile(f: FileRefLike): boolean {
  if (f.thumbnailUrl) return true
  if (f.contentType?.startsWith('image/')) return true
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(f.name ?? f.url ?? '')
}

/** PDF — previewed inline via the browser's native `<iframe>` viewer (no pdf.js). */
function isPdfFile(f: FileRefLike): boolean {
  return f.contentType === 'application/pdf' || /\.pdf(\?|#|$)/i.test(f.name ?? f.url ?? '')
}

function fileIconSlot(f: FileRefLike): keyof BstIcons {
  const name = (f.name ?? f.url ?? '').toLowerCase()
  if (/\.pdf$/.test(name)) return 'filePdf'
  if (/\.(docx?|rtf|odt)$/.test(name)) return 'fileDoc'
  if (/\.(xlsx?|csv|ods)$/.test(name)) return 'fileSheet'
  if (/\.(pptx?|odp)$/.test(name)) return 'fileSlides'
  if (/\.(zip|rar|7z|tar|gz)$/.test(name)) return 'fileArchive'
  if (/\.(mp3|wav|flac|ogg)$/.test(name)) return 'fileAudio'
  if (/\.(mp4|mov|avi|mkv|webm)$/.test(name)) return 'fileVideo'
  return 'fileGeneric'
}

/* -------------------------------------------------------- shared subcomponents */

function OptionBadge({ opt, fallback }: { opt?: BstOption; fallback: string }) {
  if (!opt) return <span className="bst-cell-text">{fallback}</span>
  const tinted = opt.color ? ' is-tinted' : ''
  return (
    <span
      className={'bst-cell-option' + tinted}
      style={opt.color ? ({ ['--opt-color']: opt.color } as Record<string, string>) : undefined}
    >
      {opt.color ? <span className="bst-option-dot" aria-hidden="true" /> : null}
      {opt.avatar ? (
        <img className="bst-option-avatar" src={opt.avatar} alt="" aria-hidden="true" />
      ) : null}
      {opt.icon ?? null}
      <span>{opt.label ?? opt.value}</span>
    </span>
  )
}

function Chip({ opt, value }: { opt?: BstOption; value: string }) {
  return (
    <span
      className={'bst-chip' + (opt?.color ? ' is-tinted' : '')}
      style={opt?.color ? ({ ['--opt-color']: opt.color } as Record<string, string>) : undefined}
    >
      {opt?.color ? <span className="bst-option-dot" aria-hidden="true" /> : null}
      {opt?.label ?? value}
    </span>
  )
}

function FileChip({ file, onClick }: { file: FileRefLike; onClick?: () => void }) {
  const icons = useBstIcons()
  const label = file.name ?? file.url ?? 'file'
  let inner: React.ReactNode
  if (isImageFile(file)) {
    inner = <img className="bst-file-thumb" src={file.thumbnailUrl ?? file.url} alt={label} />
  } else {
    const FileI = icons[fileIconSlot(file)]
    inner = (
      <>
        <span className="bst-file-icon" aria-hidden="true">
          <FileI size={16} />
        </span>
        <span className="bst-file-name">{label}</span>
      </>
    )
  }
  if (!onClick) return <span className="bst-file">{inner}</span>
  // Clickable → opens the preview. stopPropagation so the click previews the file
  // instead of selecting / editing the cell underneath it.
  return (
    <button
      type="button"
      className="bst-file bst-file-clickable"
      title={'Preview ' + label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      {inner}
    </button>
  )
}

/**
 * Dependency-free file preview overlay (B5/I3). Renders the clicked document
 * full-screen: **images** inline, **PDFs** in the browser's native viewer
 * (`<iframe>` — no pdf.js), anything else as an open/download fallback. Closes on
 * Escape or a backdrop click. Exported so adapters can reuse it from their file
 * editors. A file needs a `url` to preview.
 */
export function BstFilePreview({
  file,
  onClose,
}: {
  file: { name?: string; url?: string; thumbnailUrl?: string; contentType?: string }
  onClose: () => void
}) {
  const icons = useBstIcons()
  const Close = icons.remove
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  const url = file.url
  const name = file.name ?? 'Preview'
  const img = isImageFile(file as FileRefLike)
  const pdf = isPdfFile(file as FileRefLike)
  return (
    <div
      className="bst-file-preview-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div className="bst-file-preview" onClick={(e) => e.stopPropagation()}>
        <div className="bst-file-preview-bar">
          <span className="bst-file-preview-title" title={name}>
            {name}
          </span>
          {url ? (
            <a className="bst-file-preview-open" href={url} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          ) : null}
          <button
            type="button"
            className="bst-file-preview-close"
            onClick={onClose}
            aria-label="Close preview"
          >
            <Close size={16} />
          </button>
        </div>
        <div className="bst-file-preview-body">
          {!url ? (
            <div className="bst-file-preview-empty">No preview available</div>
          ) : img ? (
            <img className="bst-file-preview-img" src={url} alt={name} />
          ) : pdf ? (
            <iframe className="bst-file-preview-frame" src={url} title={name} />
          ) : (
            <div className="bst-file-preview-empty">
              No inline preview for this file type.{' '}
              <a href={url} target="_blank" rel="noreferrer">
                Open / download
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Read-mode `files` cell: file chips (image thumbnail / type icon + name) that
 * open {@link BstFilePreview} on click. Disable click-to-preview per column with
 * `cellMeta.preview: false`.
 */
function FilesCell({ files, meta }: { files: FileRefLike[]; meta: BstColumnMeta }) {
  const [preview, setPreview] = React.useState<FileRefLike | null>(null)
  const cm = (meta.cellMeta ?? {}) as Record<string, unknown>
  const canPreview = cm.preview !== false
  return (
    <span className="bst-cell-files">
      {files.map((f, i) => (
        <FileChip
          key={i}
          file={f}
          onClick={canPreview && f.url ? () => setPreview(f) : undefined}
        />
      ))}
      {preview ? <BstFilePreview file={preview} onClose={() => setPreview(null)} /> : null}
    </span>
  )
}

/** Boolean read cell — an injectable check for true, a muted dash for false. */
function BooleanCell({ value }: { value: unknown }) {
  const icons = useBstIcons()
  const on = value === true || value === 'true' || value === 1 || value === '1'
  const Check = icons.booleanTrue
  return (
    <span
      className={'bst-cell-bool ' + (on ? 'is-on' : 'is-off')}
      aria-label={on ? 'yes' : 'no'}
    >
      {on ? <Check size={16} /> : '—'}
    </span>
  )
}

/* --------------------------------------------------------------- cell types */

/* ------------------------------------------ field formats (ERP presets, B1/B2) */

/** Resolve the `cellMeta.pattern` (name / RegExp / object) for a column, if any. */
function cellFormat(meta: BstColumnMeta): FieldFormat | null {
  const cm = (meta.cellMeta ?? {}) as Record<string, unknown>
  if (cm.pattern == null) return null
  return resolveFieldFormat(cm.pattern, cm.patternMessage as string | undefined)
}

/** Format-preset validation → `FieldError[]`. Empty values are the `required`
 *  check's concern, so they pass here. Shared by `text` + `number`. */
function patternErrors(value: unknown, meta: BstColumnMeta): FieldError[] {
  const fmt = cellFormat(meta)
  if (!fmt?.validate || value == null || value === '') return []
  const msg = fmt.validate(String(value))
  return msg ? [{ level: 'error', message: msg, code: 'pattern' }] : []
}

/** Masked display for a patterned value, else `fallback`. */
function patternDisplay(value: unknown, meta: BstColumnMeta, fallback: string): string {
  const fmt = cellFormat(meta)
  if (!fmt || value == null || value === '') return fallback
  const s = String(value)
  return fmt.mask ? fmt.mask(s) : s
}

export const textCellType: CellType<string> = defineCellType<string>({
  id: 'text',
  renderRead: ({ value, meta }) => {
    const s = patternDisplay(value, meta, asString(value))
    return (
      <span className="bst-cell-text" title={s || undefined}>
        {s}
      </span>
    )
  },
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => {
    const fmt = cellFormat(meta)
    return (
      <input
        className="bst-input"
        autoFocus={autoFocus}
        value={asString(draft)}
        placeholder={fmt?.placeholder ?? meta.placeholder}
        inputMode={fmt?.inputMode}
        maxLength={fmt?.maxLength}
        onChange={(e) => setDraft(fmt?.normalize ? fmt.normalize(e.target.value) : e.target.value)}
      />
    )
  },
  validate: (value, ctx) => patternErrors(value, ctx.meta),
  format: (v, meta) => patternDisplay(v, meta as BstColumnMeta, asString(v)),
  parse: (raw) => raw,
  isEmpty: (v) => v == null || String(v).trim() === '',
})

export const longTextCellType: CellType<string> = defineCellType<string>({
  id: 'longText',
  // Neutral engine longText edits inline (a textarea). The MUI/shadcn adapters
  // override this with a popup dialog (editMode: 'popup').
  editMode: 'inline',
  capturesArrowKeys: true,
  renderRead: ({ value }) => {
    const s = asString(value)
    return (
      <span className="bst-cell-longtext" title={s || undefined}>
        {s}
      </span>
    )
  },
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => (
    <textarea
      className="bst-input bst-textarea"
      autoFocus={autoFocus}
      rows={3}
      value={asString(draft)}
      placeholder={meta.placeholder}
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
  format: (v) => asString(v),
  parse: (raw) => raw,
  isEmpty: (v) => v == null || String(v).trim() === '',
})

export const numberCellType: CellType<number | null> = defineCellType<number | null>({
  id: 'number',
  renderRead: ({ value, meta }) => (
    // A field-format pattern (e.g. Aadhaar) masks its own display, bypassing the
    // Intl numeric formatting (which would add thousands separators to an id).
    <span className="bst-cell-number">{patternDisplay(value, meta, numberFormat(value, meta))}</span>
  ),
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => {
    const fmt = cellFormat(meta)
    if (fmt) {
      // Patterned numeric id (Aadhaar / PIN …): a normalized text input (digits
      // only, capped) that stores a number; the mask is applied on read.
      return (
        <input
          className="bst-input bst-input-number"
          autoFocus={autoFocus}
          value={draft == null ? '' : String(draft)}
          placeholder={fmt.placeholder ?? meta.placeholder}
          inputMode={fmt.inputMode ?? 'numeric'}
          maxLength={fmt.maxLength}
          onChange={(e) => {
            const norm = fmt.normalize ? fmt.normalize(e.target.value) : e.target.value
            if (norm === '') return setDraft(null)
            const n = Number(norm)
            // Numeric patterns (aadhaar/pincode) normalize to digits → always valid;
            // a non-numeric normalize (misconfigured pattern) is ignored.
            setDraft(Number.isNaN(n) ? null : n)
          }}
        />
      )
    }
    return (
      <input
        className="bst-input bst-input-number"
        type="number"
        autoFocus={autoFocus}
        value={draft == null ? '' : String(draft)}
        placeholder={meta.placeholder}
        onChange={(e) => setDraft(e.target.value === '' ? null : Number(e.target.value))}
      />
    )
  },
  validate: (value, ctx) => patternErrors(value, ctx.meta),
  format: (v, meta) => patternDisplay(v, meta, numberFormat(v, meta)),
  parse: (raw) => parseNumber(raw),
  isEmpty: (v) => v == null,
})

export const dateTimeCellType: CellType<string | Date | null> = defineCellType<
  string | Date | null
>({
  id: 'dateTime',
  renderRead: ({ value, meta }) => (
    <span className="bst-cell-date">{dateFormat(value, meta)}</span>
  ),
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => {
    const variant = dateVariant(meta)
    const type = variant === 'time' ? 'time' : variant === 'dateTime' ? 'datetime-local' : 'date'
    return (
      <input
        className="bst-input"
        type={type}
        autoFocus={autoFocus}
        value={toDateInputValue(draft, variant)}
        onChange={(e) => setDraft(fromDateInputValue(e.target.value, variant))}
      />
    )
  },
  format: (v, meta) => dateFormat(v, meta),
  parse: (raw) => {
    const d = toDate(raw)
    return d ? d.toISOString() : null
  },
  isEmpty: (v) => v == null || v === '',
})

export const booleanCellType: CellType<boolean> = defineCellType<boolean>({
  id: 'boolean',
  renderRead: ({ value }) => <BooleanCell value={value} />,
  renderEdit: ({ draft, setDraft, commit, autoFocus }) => (
    <input
      type="checkbox"
      className="bst-checkbox"
      autoFocus={autoFocus}
      checked={!!draft}
      onChange={(e) => {
        setDraft(e.target.checked)
        commit(e.target.checked)
      }}
    />
  ),
  format: (v) => (v ? 'true' : 'false'),
  parse: (raw) => /^(true|1|yes|y|on)$/i.test(raw.trim()),
  isEmpty: () => false,
})

export const singleSelectCellType: CellType<string | null> = defineCellType<string | null>({
  id: 'singleSelect',
  renderRead: ({ value, meta }) => (
    <OptionBadge opt={findOption(meta, value)} fallback={asString(value)} />
  ),
  renderEdit: ({ draft, setDraft, commit, meta, autoFocus }) => (
    <select
      className="bst-input bst-select"
      autoFocus={autoFocus}
      value={asString(draft)}
      onChange={(e) => {
        const v = e.target.value === '' ? null : e.target.value
        setDraft(v)
        commit(v)
      }}
    >
      <option value="">—</option>
      {(meta.options ?? []).map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label ?? o.value}
        </option>
      ))}
    </select>
  ),
  format: (v, meta) => findOption(meta, v)?.label ?? asString(v),
  parse: (raw, meta) => {
    const byLabel = meta.options?.find((o) => (o.label ?? o.value) === raw)
    return byLabel?.value ?? (raw === '' ? null : raw)
  },
  isEmpty: (v) => v == null || v === '',
})

/**
 * Multi-select dropdown editor (B7) — a trigger showing the selected labels and
 * a `position: fixed` checkbox popup (the action-menu pattern, so the table's
 * scroll overflow never clips it). Toggling an option keeps the popup open;
 * closing it (outside click / trigger click / scroll / resize) commits the
 * accumulated draft — the same lifecycle as MUI's multiple `Select`. Escape
 * bubbles to the host and cancels. Dependency-free.
 */
function MultiSelectEdit({
  draft,
  setDraft,
  commit,
  meta,
  autoFocus,
}: CellEditProps<any, string[]>) {
  const arr = Array.isArray(draft) ? draft : []
  const options = meta.options ?? []
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 })
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)
  // The host recreates `commit` each render around the CURRENT draft — the
  // document-level listeners below must always call the freshest one.
  const commitRef = React.useRef(commit)
  commitRef.current = commit

  const openMenu = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const width = Math.max(180, r.width)
      const estH = Math.min(244, options.length * 32 + 10)
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
      const flipUp = r.bottom + estH + 8 > window.innerHeight && r.top - estH - 8 > 0
      const top = flipUp ? Math.max(8, r.top - estH - 4) : r.bottom + 4
      setPos({ top, left, width })
    }
    setOpen(true)
  }

  // A single-cell edit (autoFocus) pops the menu immediately. In a row session
  // every cell mounts an editor at once — we must not open them all (MUI parity).
  React.useLayoutEffect(() => {
    if (autoFocus) {
      btnRef.current?.focus()
      openMenu()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      commitRef.current()
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
      close()
    }
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return // the list's own scroll
      close()
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const toggle = (v: string) =>
    setDraft(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

  const summary = arr.map((v) => findOption(meta, v)?.label ?? v).join(', ')

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="bst-input bst-select bst-msel-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false)
            commit()
          } else {
            openMenu()
          }
        }}
      >
        <span className={'bst-msel-value' + (summary ? '' : ' is-empty')}>
          {summary || '—'}
        </span>
      </button>
      {open && (
        <div
          ref={menuRef}
          className="bst-row-menu bst-msel-menu"
          role="listbox"
          aria-multiselectable="true"
          style={{ position: 'fixed', top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {options.map((o) => (
            <label
              key={o.value}
              className="bst-msel-item"
              role="option"
              aria-selected={arr.includes(o.value)}
            >
              <input
                type="checkbox"
                className="bst-checkbox"
                disabled={o.disabled}
                checked={arr.includes(o.value)}
                onChange={() => toggle(o.value)}
              />
              {o.color ? (
                <span className="bst-msel-dot" style={{ background: o.color }} />
              ) : null}
              <span className="bst-msel-label">{o.label ?? o.value}</span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

/** Gap between chips — keep in sync with `.bst-cell-chips` `gap` in bst-table.css. */
const CHIP_GAP = 4

/**
 * Width-aware multi-select chips (B7): show as many chips as the cell width fits,
 * folding the remainder into one `+N more` badge — widen the column and more chips
 * appear, shrink it and they collapse back. Opt-in via `cellMeta.fitChips`;
 * `cellMeta.maxChips` (if also set) then acts as an upper cap. A hidden ghost row
 * (all chips + a sample badge) is measured so widths stay known even while some
 * chips are hidden, and a ResizeObserver on the visible row recomputes on resize.
 * Where there is no layout (SSR / jsdom before a measure) every chip is shown.
 */
function MultiSelectChips({
  arr,
  meta,
  cap,
}: {
  arr: string[]
  meta: BstColumnMeta
  cap?: number
}) {
  const boxRef = React.useRef<HTMLSpanElement>(null)
  const ghostRef = React.useRef<HTMLSpanElement>(null)
  const [count, setCount] = React.useState(arr.length)
  const key = arr.join('')

  React.useLayoutEffect(() => {
    const box = boxRef.current
    const ghost = ghostRef.current
    if (!box || !ghost) return
    const recompute = () => {
      const avail = box.clientWidth
      if (avail <= 0) return // no layout yet → leave every chip shown
      const widths: number[] = []
      ghost
        .querySelectorAll<HTMLElement>('.bst-chip:not(.bst-chip-more)')
        .forEach((el) => widths.push(el.offsetWidth))
      const moreW = ghost.querySelector<HTMLElement>('.bst-chip-more')?.offsetWidth ?? 48
      const fit = (budget: number) => {
        let sum = 0
        let n = 0
        for (let i = 0; i < widths.length; i++) {
          const w = widths[i] + (i > 0 ? CHIP_GAP : 0)
          if (sum + w > budget) break
          sum += w
          n++
        }
        return n
      }
      let n = fit(avail)
      // Not everything fits → reserve room for the badge and keep at least one chip.
      if (n < widths.length) n = Math.max(1, fit(avail - moreW - CHIP_GAP))
      if (cap != null) n = Math.min(n, cap)
      setCount(n)
    }
    recompute()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(recompute)
    ro.observe(box)
    return () => ro.disconnect()
  }, [key, cap])

  const shown = arr.slice(0, count)
  const extra = arr.length - shown.length
  return (
    <span ref={boxRef} className="bst-cell-chips bst-cell-chips-fit">
      {shown.map((v) => (
        <Chip key={v} opt={findOption(meta, v)} value={v} />
      ))}
      {extra > 0 ? <span className="bst-chip bst-chip-more">+{extra} more</span> : null}
      {/* Ghost row (invisible, off-flow): all chips + a sample badge, measured for
          true widths so the fit survives chips being hidden. */}
      <span ref={ghostRef} className="bst-cell-chips-measure" aria-hidden="true">
        {arr.map((v) => (
          <Chip key={v} opt={findOption(meta, v)} value={v} />
        ))}
        <span className="bst-chip bst-chip-more">+0 more</span>
      </span>
    </span>
  )
}

export const multiSelectCellType: CellType<string[]> = defineCellType<string[]>({
  id: 'multiSelect',
  // The popup renders outside the cell's flow — the host must not commit-on-blur
  // while it is open; the editor commits itself when the popup closes.
  overlayEditor: true,
  renderRead: ({ value, meta }) => {
    const arr = Array.isArray(value) ? value : value == null ? [] : [String(value)]
    const cm = (meta.cellMeta ?? {}) as Record<string, any>
    // Width-aware mode (B7): fit chips to the cell, `maxChips` an optional cap.
    if (cm.fitChips) {
      return (
        <MultiSelectChips
          arr={arr}
          meta={meta}
          cap={typeof cm.maxChips === 'number' ? cm.maxChips : undefined}
        />
      )
    }
    // Fixed-count mode (default, unchanged): show up to `maxChips` (default 3).
    const max: number = cm.maxChips ?? 3
    const shown = arr.slice(0, max)
    const extra = arr.length - shown.length
    return (
      <span className="bst-cell-chips">
        {shown.map((v) => (
          <Chip key={v} opt={findOption(meta, v)} value={v} />
        ))}
        {extra > 0 ? <span className="bst-chip bst-chip-more">+{extra} more</span> : null}
      </span>
    )
  },
  renderEdit: (p) => <MultiSelectEdit {...p} />,
  format: (v, meta) => (Array.isArray(v) ? v : []).map((x) => findOption(meta, x)?.label ?? x).join(', '),
  parse: (raw, meta) =>
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => meta.options?.find((o) => (o.label ?? o.value) === s)?.value ?? s),
  isEmpty: (v) => !Array.isArray(v) || v.length === 0,
})

export const radioCellType: CellType<string | null> = defineCellType<string | null>({
  id: 'radio',
  renderRead: ({ value, meta }) => (
    <OptionBadge opt={findOption(meta, value)} fallback={asString(value)} />
  ),
  renderEdit: ({ draft, setDraft, commit, meta, rowId, columnId }) => {
    const cm = (meta.cellMeta ?? {}) as Record<string, any>
    const layout = cm.layout === 'horizontal' ? 'is-horizontal' : 'is-vertical'
    return (
      <div className={'bst-radio-group ' + layout} role="radiogroup">
        {(meta.options ?? []).map((o) => (
          <label key={o.value} className="bst-radio">
            <input
              type="radio"
              name={rowId + '::' + columnId}
              checked={draft === o.value}
              disabled={o.disabled}
              onChange={() => {
                setDraft(o.value)
                commit(o.value)
              }}
            />
            {o.label ?? o.value}
          </label>
        ))}
      </div>
    )
  },
  format: (v, meta) => findOption(meta, v)?.label ?? asString(v),
  parse: (raw, meta) =>
    meta.options?.find((o) => (o.label ?? o.value) === raw)?.value ?? (raw === '' ? null : raw),
  isEmpty: (v) => v == null || v === '',
})

export const hyperlinkCellType: CellType<unknown> = defineCellType<unknown>({
  id: 'hyperlink',
  renderRead: ({ value, meta }) => {
    const { href, label } = normalizeLink(value)
    const cm = (meta.cellMeta ?? {}) as Record<string, any>
    if (!href) return <span className="bst-cell-text">{label}</span>
    return (
      <a
        className="bst-cell-link"
        href={href}
        target={cm.target ?? '_blank'}
        rel="noopener noreferrer"
      >
        {label || href}
      </a>
    )
  },
  renderEdit: ({ draft, setDraft, autoFocus }) => (
    <input
      className="bst-input"
      autoFocus={autoFocus}
      value={normalizeLink(draft).href}
      placeholder="https://…"
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
  format: (v) => normalizeLink(v).href,
  parse: (raw) => raw,
  isEmpty: (v) => !normalizeLink(v).href,
})

export const filesCellType: CellType<unknown> = defineCellType<unknown>({
  id: 'files',
  editMode: 'popup',
  renderRead: ({ value, meta }) => {
    const files = normalizeFiles(value)
    if (!files.length) return <span className="bst-cell-muted">—</span>
    return <FilesCell files={files} meta={meta} />
  },
  format: (v) => normalizeFiles(v).map((f) => f.name ?? f.url ?? '').join(', '),
  isEmpty: (v) => normalizeFiles(v).length === 0,
})

export const actionCellType: CellType<unknown> = defineCellType<unknown>({
  id: 'action',
  renderRead: ({ api, meta }) => {
    const a = meta.actions ?? { edit: true, delete: true }
    return (
      <span className="bst-cell-actions">
        {a.edit &&
          (api.isEditing ? (
            <button
              type="button"
              className="bst-action bst-action-primary"
              onClick={() => api.saveRow()}
              disabled={api.isDisabled}
            >
              Save
            </button>
          ) : (
            <button
              type="button"
              className="bst-action"
              onClick={() => api.editRow()}
              disabled={api.isDisabled}
            >
              Edit
            </button>
          ))}
        {a.edit && api.isEditing ? (
          <button type="button" className="bst-action" onClick={() => api.cancelEditing()}>
            Cancel
          </button>
        ) : null}
        {a.duplicate ? (
          <button type="button" className="bst-action" onClick={() => api.duplicateRow()}>
            Copy
          </button>
        ) : null}
        {a.delete ? (
          <button
            type="button"
            className="bst-action bst-action-danger"
            onClick={() => api.deleteRow()}
            disabled={api.isDisabled}
          >
            Delete
          </button>
        ) : null}
      </span>
    )
  },
})

/* ------------------------------------------------------ M1/M2 visualization */

function toNumArray(v: unknown): number[] {
  const arr = Array.isArray(v)
    ? v
    : typeof v === 'string'
      ? v.split(',')
      : []
  return arr.map((x) => Number(x)).filter((n) => !Number.isNaN(n))
}

/** In-cell sparkline (M1) — dep-free inline SVG (line / area / bar). */
function Sparkline({ values, meta }: { values: number[]; meta: BstColumnMeta }) {
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const w = Number(cm.width ?? 84)
  const h = Number(cm.height ?? 22)
  const pad = 2
  const variant = (cm.variant ?? 'line') as 'line' | 'area' | 'bar'
  const color = (cm.color ?? 'var(--bst-table-accent)') as string
  if (values.length === 0) return <span className="bst-cell-muted">—</span>
  const min = cm.min != null ? Number(cm.min) : Math.min(...values)
  const max = cm.max != null ? Number(cm.max) : Math.max(...values)
  const span = max - min || 1
  const n = values.length
  const px = (i: number) => (n === 1 ? w / 2 : pad + (i * (w - 2 * pad)) / (n - 1))
  const py = (val: number) => h - pad - ((val - min) / span) * (h - 2 * pad)

  let body: any
  if (variant === 'bar') {
    const bw = Math.max(1, (w - 2 * pad) / n - 1)
    body = values.map((val, i) => {
      const bx = pad + (i * (w - 2 * pad)) / n
      const by = py(val)
      return <rect key={i} x={bx} y={by} width={bw} height={Math.max(0, h - pad - by)} fill={color} />
    })
  } else {
    const pts = values.map((val, i) => `${px(i)},${py(val)}`).join(' ')
    body =
      variant === 'area' ? (
        <>
          <polygon points={`${pad},${h - pad} ${pts} ${w - pad},${h - pad}`} fill={color} opacity={0.15} />
          <polyline points={pts} fill="none" stroke={color} strokeWidth={1.25} strokeLinejoin="round" />
        </>
      ) : (
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth={1.25}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )
  }
  return (
    <span className="bst-cell-sparkline">
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="sparkline">
        {body}
      </svg>
      {cm.showValue ? (
        <span className="bst-spark-val">{numberFormat(values[values.length - 1], meta)}</span>
      ) : null}
    </span>
  )
}

/** KPI cell (M2) — a value + optional delta (trend) + optional mini sparkline. */
function KpiCell({ value, meta }: { value: unknown; meta: BstColumnMeta }) {
  const icons = useBstIcons()
  const cm = (meta.cellMeta ?? {}) as Record<string, any>
  const obj: { value?: unknown; delta?: number | null; data?: number[] } =
    value != null && typeof value === 'object' ? (value as any) : { value }
  const delta = obj.delta == null ? null : Number(obj.delta)
  const dir = delta == null || delta === 0 ? 0 : delta > 0 ? 1 : -1
  const good = cm.invertDelta ? -dir : dir
  const deltaText =
    delta == null
      ? null
      : `${delta > 0 ? '+' : ''}${cm.deltaPercent ? delta + '%' : numberFormat(delta, meta)}`
  return (
    <span className="bst-cell-kpi">
      <span className="bst-kpi-value">{numberFormat(obj.value, meta)}</span>
      {delta != null && (
        <span
          className={
            'bst-kpi-delta ' + (good > 0 ? 'is-up' : good < 0 ? 'is-down' : 'is-flat')
          }
        >
          <span aria-hidden="true">
            {dir > 0 ? (
              <icons.trendUp size={12} />
            ) : dir < 0 ? (
              <icons.trendDown size={12} />
            ) : (
              '–'
            )}
          </span>
          {deltaText}
        </span>
      )}
      {Array.isArray(obj.data) && obj.data.length > 0 ? (
        <Sparkline values={obj.data} meta={{ ...meta, cellMeta: { ...cm, width: cm.sparkWidth ?? 46, height: 16 } }} />
      ) : null}
    </span>
  )
}

/** In-cell sparkline cell type (M1). Value = `number[]` (or a comma string). */
export const sparklineCellType: CellType<number[] | null> = defineCellType<number[] | null>({
  id: 'sparkline',
  renderRead: ({ value, meta }) => <Sparkline values={toNumArray(value)} meta={meta} />,
  format: (v) => (Array.isArray(v) ? v.join(', ') : asString(v)),
  parse: (raw) => toNumArray(raw),
  isEmpty: (v) => !Array.isArray(v) || v.length === 0,
})

/** KPI cell type (M2). Value = `number` or `{ value, delta?, data? }`. */
export const kpiCellType: CellType<unknown> = defineCellType<unknown>({
  id: 'kpi',
  renderRead: ({ value, meta }) => <KpiCell value={value} meta={meta} />,
  format: (v, meta) => numberFormat(v != null && typeof v === 'object' ? (v as any).value : v, meta),
  isEmpty: (v) => v == null,
})

/** Every neutral cell type, in registry order. */
/** ⋯ kebab glyph — inline SVG (emoji-free, matches the engine icon convention). */
function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <circle cx="8" cy="3" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="13" r="1.4" fill="currentColor" />
    </svg>
  )
}

interface RowMenuItem {
  key: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

/**
 * Row overflow ("⋯" / three-dots) menu — the compact alternative to the inline
 * action buttons. Same actions (edit / save / cancel / duplicate / delete, driven
 * by `api`), collapsed into a popup. Dependency-free: a `position: fixed` popup so
 * the table's scroll overflow never clips it, closing on outside-click / Escape /
 * scroll. Opt in with `meta.type: 'actionMenu'`.
 */
function ActionMenuCell({ api, meta }: { api: BstCellApi; meta: BstColumnMeta }) {
  const a = meta.actions ?? { edit: true, delete: true }
  const [open, setOpen] = React.useState(false)
  const [pos, setPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const btnRef = React.useRef<HTMLButtonElement>(null)
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onScroll = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const items: RowMenuItem[] = []
  if (a.edit) {
    if (api.isEditing) {
      items.push({ key: 'save', label: 'Save', onClick: () => api.saveRow(), disabled: api.isDisabled })
      items.push({ key: 'cancel', label: 'Cancel', onClick: () => api.cancelEditing() })
    } else {
      items.push({ key: 'edit', label: 'Edit', onClick: () => api.editRow(), disabled: api.isDisabled })
    }
  }
  if (a.duplicate) items.push({ key: 'duplicate', label: 'Duplicate', onClick: () => api.duplicateRow() })
  if (a.delete)
    items.push({
      key: 'delete',
      label: 'Delete',
      onClick: () => api.deleteRow(),
      danger: true,
      disabled: api.isDisabled,
    })

  const toggle = () => {
    if (open) {
      setOpen(false)
      return
    }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const width = 168
      const estH = items.length * 34 + 8
      const left = Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8))
      const flipUp = r.bottom + estH + 8 > window.innerHeight && r.top - estH - 8 > 0
      const top = flipUp ? Math.max(8, r.top - estH - 4) : r.bottom + 4
      setPos({ top, left })
    }
    setOpen(true)
  }

  const choose = (fn: () => void) => {
    setOpen(false)
    fn()
  }

  return (
    <>
      <span className="bst-cell-actions">
        <button
          ref={btnRef}
          type="button"
          className="bst-action bst-action-kebab"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Row actions"
          onClick={toggle}
        >
          <KebabIcon />
        </button>
      </span>
      {open && (
        <div
          ref={menuRef}
          className="bst-row-menu"
          role="menu"
          style={{ position: 'fixed', top: pos.top, left: pos.left }}
        >
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              className={'bst-row-menu-item' + (it.danger ? ' bst-row-menu-danger' : '')}
              disabled={it.disabled}
              onClick={() => choose(it.onClick)}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/**
 * Action **overflow menu** (B10 variant) — a single "⋯" button that opens a popup
 * of the row's actions, instead of the inline buttons of `action`. Reads the same
 * `meta.actions` config; opt in via `meta.type: 'actionMenu'`.
 */
export const actionMenuCellType: CellType<unknown> = defineCellType<unknown>({
  id: 'actionMenu',
  renderRead: ({ api, meta }) => <ActionMenuCell api={api} meta={meta} />,
})

export const defaultCellTypes: Array<CellType<any, any, any>> = [
  textCellType,
  longTextCellType,
  numberCellType,
  dateTimeCellType,
  booleanCellType,
  singleSelectCellType,
  multiSelectCellType,
  radioCellType,
  hyperlinkCellType,
  filesCellType,
  sparklineCellType,
  kpiCellType,
  qrCellType,
  barcodeCellType,
  richTextCellType,
  actionCellType,
  actionMenuCellType,
]

/** A registry seeded with the neutral defaults (used when no preset is supplied). */
export function createDefaultRegistry(): CellTypeRegistry {
  return createCellTypeRegistry(defaultCellTypes)
}
