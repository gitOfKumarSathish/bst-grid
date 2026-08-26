import * as React from 'react'

export interface BstNoteEditorProps {
  rowId: string
  columnId: string
  initialText: string
  anchorRect: DOMRect | null
  onSave: (text: string) => void
  onDelete?: () => void
  onClose: () => void
  placeholder?: string
}

/**
 * Resizable popover editor for cell notes / comments.
 * Closes on Escape or outside click, saves on Save button or Ctrl/Cmd+Enter.
 */
export function BstNoteEditor({
  rowId,
  columnId,
  initialText,
  anchorRect,
  onSave,
  onDelete,
  onClose,
  placeholder = 'Add a note…',
}: BstNoteEditorProps) {
  const [text, setText] = React.useState(initialText)
  const editorRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    textareaRef.current?.focus()
    // Position cursor at end of text
    if (textareaRef.current) {
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [])

  // Position popover relative to anchor cell, keeping inside viewport
  const style = React.useMemo<React.CSSProperties>(() => {
    if (!anchorRect) {
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }
    }
    const width = 280
    const height = 180
    const margin = 8

    let left = anchorRect.right + margin
    let top = anchorRect.top

    // Viewport clamp
    if (typeof window !== 'undefined') {
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, anchorRect.left - width - margin)
      }
      if (top + height > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - height - margin)
      }
    }

    return {
      position: 'fixed',
      top: `${Math.max(margin, top)}px`,
      left: `${Math.max(margin, left)}px`,
      zIndex: 1000,
    }
  }, [anchorRect])

  // Handle outside click & global escape
  React.useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [onClose])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      onSave(text)
    }
  }

  return (
    <div
      ref={editorRef}
      className="bst-note-editor"
      style={style}
      role="dialog"
      aria-label="Cell note editor"
      data-bst-rowid={rowId}
      data-bst-colid={columnId}
    >
      <div className="bst-note-editor-header">
        <span className="bst-note-editor-title">Cell Note</span>
        <button
          type="button"
          className="bst-note-btn-close"
          aria-label="Close note"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="bst-note-editor-body">
        <textarea
          ref={textareaRef}
          className="bst-note-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={4}
        />
      </div>
      <div className="bst-note-editor-footer">
        {initialText && onDelete ? (
          <button
            type="button"
            className="bst-note-btn bst-note-btn-delete"
            onClick={onDelete}
          >
            Delete
          </button>
        ) : <span />}
        <div className="bst-note-editor-actions">
          <button
            type="button"
            className="bst-note-btn bst-note-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bst-note-btn bst-note-btn-save"
            onClick={() => onSave(text)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export interface BstNotePopoverProps {
  note: string
  anchorRect: DOMRect | null
  onEdit?: () => void
}

/**
 * Read-only floating tooltip/popover when hovering over a cell with a note.
 */
export function BstNotePopover({ note, anchorRect, onEdit }: BstNotePopoverProps) {
  if (!note || !anchorRect) return null

  const width = 240
  const margin = 6
  let left = anchorRect.right + margin
  let top = anchorRect.top

  if (typeof window !== 'undefined') {
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, anchorRect.left - width - margin)
    }
    if (top + 120 > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - 120 - margin)
    }
  }

  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${Math.max(margin, top)}px`,
    left: `${Math.max(margin, left)}px`,
    zIndex: 999,
    maxWidth: `${width}px`,
  }

  return (
    <div
      className="bst-note-popover"
      style={style}
      role="tooltip"
      aria-label="Cell note preview"
      onClick={onEdit}
    >
      <div className="bst-note-popover-text">{note}</div>
    </div>
  )
}
