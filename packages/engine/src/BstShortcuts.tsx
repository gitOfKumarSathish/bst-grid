import * as React from 'react'
import type { RowData } from '@tanstack/react-table'
import { getBstRuntime } from './useBstTable.js'
import {
  resolveActiveShortcuts,
  formatShortcutToken,
  type ResolvedShortcutGroup,
} from './shortcuts.js'

/** Best-effort platform check (client only) for ⌘ vs Ctrl. */
function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const s = `${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`
  return /Mac|iPhone|iPad|iPod/i.test(s)
}

/** Only intercept `?` when the user isn't typing into a field. */
function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

export interface BstShortcutsProps<TData extends RowData> {
  /** The table from `useBstTable` / `useBstGrid` — its resolved flags decide which
   *  shortcuts are shown. */
  table: unknown
  /** Extra class on the trigger button (adapters can blend it into their toolbar). */
  className?: string
  /** Key rendering: `'mac'` forces ⌘/⇧, `'pc'` forces Ctrl, `'auto'` (default)
   *  detects from `navigator`. Use it when detection is unreliable (remote/proxied). */
  platform?: 'mac' | 'pc' | 'auto'
}

/**
 * In-UI keyboard-shortcuts help: a trigger button + a dependency-free overlay
 * that lists **only the shortcuts active on this grid** (grouped, searchable,
 * platform-aware). Also opens on `?`. Self-contained so an adapter just drops in
 * `<BstShortcuts table={table} />`.
 */
export function BstShortcuts<TData extends RowData>({
  table,
  className,
  platform = 'auto',
}: BstShortcutsProps<TData>) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')
  const isMac = React.useMemo(
    () => (platform === 'mac' ? true : platform === 'pc' ? false : detectMac()),
    [platform],
  )

  const handle = getBstRuntime<TData>(table) as unknown as Record<string, boolean>
  const flags: Record<string, boolean> = {
    enableCellSelection: !!handle.enableCellSelection,
    enableClipboard: !!handle.enableClipboard,
    enableUndoRedo: !!handle.enableUndoRedo,
    enableEditing: !!handle.enableEditing,
    enableCopyColumn: !!handle.enableCopyColumn,
    enableCopyRow: !!handle.enableCopyRow,
  }
  const groups = resolveActiveShortcuts(flags, query, isMac)

  // `?` toggles the overlay (unless the user is typing).
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '?' && !isTypingTarget(e.target)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Esc closes; reset the search when it closes.
  React.useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [open])

  return (
    <>
      <button
        type="button"
        className={className}
        aria-label="Keyboard shortcuts"
        title="Keyboard shortcuts (?)"
        onClick={() => setOpen(true)}
        style={S.trigger}
      >
        <KeyboardGlyph />
      </button>
      {open ? (
        <ShortcutsOverlay
          groups={groups}
          query={query}
          setQuery={setQuery}
          isMac={isMac}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function ShortcutsOverlay({
  groups,
  query,
  setQuery,
  isMac,
  onClose,
}: {
  groups: ResolvedShortcutGroup[]
  query: string
  setQuery: (q: string) => void
  isMac: boolean
  onClose: () => void
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null)
  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])
  return (
    <div style={S.backdrop} onMouseDown={onClose} role="presentation">
      <div
        style={S.card}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={S.header}>
          <span style={S.title}>Keyboard shortcuts</span>
          <button type="button" aria-label="Close" onClick={onClose} style={S.close}>
            ✕
          </button>
        </div>
        <div style={S.searchWrap}>
          <input
            ref={inputRef}
            type="search"
            placeholder="Search shortcuts…"
            aria-label="Search shortcuts"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={S.search}
          />
        </div>
        <div style={S.body}>
          {groups.length === 0 ? (
            <div style={S.empty}>
              No keyboard shortcuts are active on this grid. Turn on cell selection, clipboard,
              editing or undo/redo to use them.
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.category} style={S.group}>
                <div style={S.groupLabel}>{g.category}</div>
                {g.items.map((it) => (
                  <div key={it.label} style={S.row}>
                    <span style={S.rowLabel}>{it.label}</span>
                    <span style={S.keys}>
                      {it.keys.map((k, i) => (
                        <kbd key={i} style={S.kbd}>
                          {formatShortcutToken(k, isMac)}
                        </kbd>
                      ))}
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function KeyboardGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="2.5" y="6" width="19" height="12" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M6 9.5h.01M9 9.5h.01M12 9.5h.01M15 9.5h.01M18 9.5h.01M6 12.5h.01M9 12.5h.01M12 12.5h.01M15 12.5h.01M18 12.5h.01M8 15.5h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Dependency-free, theme-aware styles (via the engine's --bst-table-* vars, with
// fallbacks) so the overlay looks native in both skins, light and dark.
const S: Record<string, React.CSSProperties> = {
  trigger: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
    padding: 0,
    background: 'transparent',
    border: 'none',
    borderRadius: 'var(--bst-table-radius, 6px)',
    color: 'inherit',
    cursor: 'pointer',
    opacity: 0.75,
  },
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 90,
    padding: 16,
  },
  card: {
    width: 'min(520px, 96vw)',
    maxHeight: '82vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bst-table-bg, #fff)',
    color: 'var(--bst-table-fg, #111827)',
    font: 'var(--bst-table-font, inherit)',
    border: '1px solid var(--bst-table-border, #e5e7eb)',
    borderRadius: 'calc(var(--bst-table-radius, 6px) + 4px)',
    boxShadow: '0 20px 60px -20px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    background: 'var(--bst-table-header-bg, #f9fafb)',
    color: 'var(--bst-table-header-fg, inherit)',
    borderBottom: '1px solid var(--bst-table-border, #e5e7eb)',
  },
  title: { flex: 1, fontWeight: 600, fontSize: 15 },
  close: {
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    fontSize: 15,
    lineHeight: 1,
    opacity: 0.7,
    padding: 4,
  },
  searchWrap: { padding: '10px 16px', borderBottom: '1px solid var(--bst-table-border, #e5e7eb)' },
  search: {
    width: '100%',
    boxSizing: 'border-box',
    height: 34,
    padding: '0 10px',
    fontSize: 14,
    color: 'inherit',
    background: 'var(--bst-table-bg, #fff)',
    border: '1px solid var(--bst-table-border, #e5e7eb)',
    borderRadius: 'var(--bst-table-radius, 6px)',
    outline: 'none',
  },
  body: { overflowY: 'auto', padding: '6px 0' },
  empty: {
    padding: '28px 16px',
    textAlign: 'center',
    color: 'var(--bst-table-muted, #6b7280)',
    fontSize: 13,
    lineHeight: 1.6,
  },
  group: { padding: '4px 0 8px' },
  groupLabel: {
    padding: '10px 16px 4px',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--bst-table-muted, #6b7280)',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '7px 16px',
  },
  rowLabel: { flex: 1, fontSize: 14 },
  keys: { display: 'inline-flex', gap: 4, flex: 'none' },
  kbd: {
    display: 'inline-flex',
    alignItems: 'center',
    minWidth: 20,
    height: 22,
    padding: '0 6px',
    justifyContent: 'center',
    fontSize: 12,
    fontFamily: 'inherit',
    color: 'var(--bst-table-fg, #111827)',
    background: 'var(--bst-table-row-hover, #f3f4f6)',
    border: '1px solid var(--bst-table-border, #e5e7eb)',
    borderRadius: 4,
  },
}
