import * as React from 'react'
import {
  createCellTypeRegistry,
  defineCellType,
  defaultCellTypes,
  longTextCellType,
  filesCellType,
  richTextCellType,
  sanitizeHtml,
} from '@bloomskill/table-engine'
import type { CellTypeRegistry } from '@bloomskill/table-engine'

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

const scFiles = defineCellType<unknown>({
  ...filesCellType,
  editMode: 'popup',
  renderEdit: ({ draft, setDraft, commit, cancel }) => {
    const files = filesOf(draft)
    return (
      <ScModal
        title="Files"
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
        {files.length === 0 ? (
          <div className="sc-muted">No files</div>
        ) : (
          files.map((f, i) => (
            <div key={i} className="sc-file-row">
              <span className="sc-file-name">{f.name ?? f.url}</span>
              <button
                type="button"
                className="sc-btn sc-btn-danger"
                onClick={() => setDraft(files.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          ))
        )}
        <label className="sc-btn" style={{ marginTop: 8, display: 'inline-block' }}>
          Add file
          <input
            type="file"
            hidden
            multiple
            onChange={(e) => {
              const added = Array.from(e.target.files ?? []).map((file) => ({
                name: file.name,
                contentType: file.type,
              }))
              setDraft([...files, ...added])
            }}
          />
        </label>
      </ScModal>
    )
  },
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
