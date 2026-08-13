import * as React from 'react'
import {
  createCellTypeRegistry,
  defineCellType,
  defaultCellTypes,
  longTextCellType,
  filesCellType,
  richTextCellType,
  sanitizeHtml,
  BstFilePreview,
} from '@bloomskill/table-engine'
import type { CellTypeRegistry, BstColumnMeta } from '@bloomskill/table-engine'

/**
 * shadcn/Radix adapter cell types. Text/number/date/boolean/select/radio use the
 * engine's neutral native-control editors (styled by shadcn CSS via `--bst-*`
 * vars + `.bst-input`), matching Plan.md §2.6 (adapters own editors + chrome).
 * Popup editors (longText, files) get a lightweight, dependency-free modal so
 * shadcn reaches MUI parity without pulling in a dialog library.
 */

function ScModal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <div className="sc-modal-overlay" onMouseDown={onClose}>
      <div
        className="sc-modal"
        role="dialog"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sc-modal-title">{title}</div>
        <div className="sc-modal-body">{children}</div>
        <div className="sc-modal-footer">{footer}</div>
      </div>
    </div>
  )
}

interface FileLike {
  name?: string
  url?: string
  contentType?: string
}
function filesOf(v: unknown): FileLike[] {
  if (v == null || v === '') return []
  const arr = Array.isArray(v) ? v : [v]
  return arr.map((f) => (typeof f === 'string' ? { name: f } : (f as FileLike)))
}

const scLongText = defineCellType<string>({
  ...longTextCellType,
  editMode: 'popup',
  renderEdit: ({ draft, setDraft, commit, cancel, meta }) => (
    <ScModal
      title="Edit"
      onClose={cancel}
      footer={
        <>
          <button type="button" className="sc-btn" onClick={cancel}>
            Cancel
          </button>
          <button type="button" className="sc-btn sc-btn-primary" onClick={() => commit()}>
            Save
          </button>
        </>
      }
    >
      <textarea
        className="bst-input bst-textarea"
        autoFocus
        rows={5}
        value={draft ?? ''}
        placeholder={meta.placeholder}
        onChange={(e) => setDraft(e.target.value)}
      />
    </ScModal>
  ),
})

/**
 * Files editor (B5/I3) — add / remove with **click-to-preview** (engine
 * `BstFilePreview`). Opt-in backend wiring via `cellMeta.onUpload(file)` /
 * `cellMeta.onDelete(file)` (busy state shown); without `onUpload`, files get a
 * local object URL so preview works offline. `cellMeta.accept` / `.multiple` tune
 * the picker. Mirrors the MUI editor for skin parity.
 */
function ScFilesEdit(p: {
  draft: unknown
  setDraft: (v: unknown) => void
  commit: (override?: unknown) => void
  cancel: () => void
  meta: BstColumnMeta
}) {
  const files = filesOf(p.draft)
  const cm = (p.meta?.cellMeta ?? {}) as Record<string, any>
  const onUpload = cm.onUpload as ((file: File) => FileLike | Promise<FileLike>) | undefined
  const onDelete = cm.onDelete as ((file: FileLike) => void | Promise<void>) | undefined
  const [preview, setPreview] = React.useState<FileLike | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const addFiles = async (list: FileList | null) => {
    const picked = Array.from(list ?? [])
    if (!picked.length) return
    setError(null)
    if (onUpload) {
      setBusy(true)
      try {
        const results: FileLike[] = []
        for (const file of picked) results.push(await onUpload(file))
        p.setDraft([...files, ...results])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setBusy(false)
      }
    } else {
      p.setDraft([
        ...files,
        ...picked.map((file) => ({ name: file.name, contentType: file.type, url: URL.createObjectURL(file) })),
      ])
    }
  }

  const removeAt = async (i: number) => {
    if (onDelete) {
      setBusy(true)
      try {
        await onDelete(files[i])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Delete failed')
        setBusy(false)
        return
      }
      setBusy(false)
    }
    p.setDraft(files.filter((_, j) => j !== i))
  }

  return (
    <ScModal
      title="Files"
      onClose={p.cancel}
      footer={
        <>
          <button type="button" className="sc-btn" onClick={p.cancel}>
            Cancel
          </button>
          <button type="button" className="sc-btn sc-btn-primary" disabled={busy} onClick={() => p.commit()}>
            Save
          </button>
        </>
      }
    >
      {files.length === 0 ? (
        <div className="sc-muted">No files</div>
      ) : (
        files.map((f, i) => (
          <div key={i} className="sc-file-row">
            {f.url ? (
              <button type="button" className="sc-file-name sc-file-link" onClick={() => setPreview(f)} title="Preview">
                {f.name ?? f.url}
              </button>
            ) : (
              <span className="sc-file-name">{f.name ?? f.url}</span>
            )}
            <button type="button" className="sc-btn sc-btn-danger" disabled={busy} onClick={() => removeAt(i)}>
              Remove
            </button>
          </div>
        ))
      )}
      {error ? <div style={{ color: '#dc2626', fontSize: 12, marginTop: 6 }}>{error}</div> : null}
      <label className="sc-btn" style={{ marginTop: 8, display: 'inline-block' }}>
        {busy ? 'Uploading…' : 'Add file'}
        <input
          type="file"
          hidden
          multiple={cm.multiple !== false}
          accept={cm.accept}
          onChange={(e) => addFiles(e.target.files)}
        />
      </label>
      {preview ? <BstFilePreview file={preview} onClose={() => setPreview(null)} /> : null}
    </ScModal>
  )
}

const scFiles = defineCellType<unknown>({
  ...filesCellType,
  editMode: 'popup',
  renderEdit: (props) => <ScFilesEdit {...(props as any)} />,
})

function ScRichTextEdit({
  draft,
  commit,
  cancel,
}: {
  draft: string
  commit: (v?: string) => void
  cancel: () => void
}) {
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = sanitizeHtml(draft ?? '')
      ref.current.focus()
    }
  }, [])
  const exec = (cmd: string) => {
    document.execCommand(cmd, false)
    ref.current?.focus()
  }
  const btn = (cmd: string, label: React.ReactNode, title: string) => (
    <button
      type="button"
      className="sc-btn sc-richtext-btn"
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
    <ScModal
      title="Edit"
      onClose={cancel}
      footer={
        <>
          <button type="button" className="sc-btn" onClick={cancel}>
            Cancel
          </button>
          <button
            type="button"
            className="sc-btn sc-btn-primary"
            onClick={() => commit(sanitizeHtml(ref.current?.innerHTML ?? ''))}
          >
            Save
          </button>
        </>
      }
    >
      <div className="sc-richtext-toolbar">
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
      />
    </ScModal>
  )
}

const scRichText = defineCellType<string>({
  ...richTextCellType,
  editMode: 'popup',
  renderEdit: ({ draft, commit, cancel }) => (
    <ScRichTextEdit draft={draft} commit={commit} cancel={cancel} />
  ),
})

/** shadcn cell types = neutral defaults with popup editors overridden. */
export const shadcnCellTypes = [
  ...defaultCellTypes.filter(
    (ct) => ct.id !== 'longText' && ct.id !== 'files' && ct.id !== 'richText',
  ),
  scLongText,
  scFiles,
  scRichText,
]

/** Build a registry with the shadcn editors. Pass as `cellTypes`. */
export function createShadcnPreset(): CellTypeRegistry {
  return createCellTypeRegistry(shadcnCellTypes)
}
