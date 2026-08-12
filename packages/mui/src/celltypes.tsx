import * as React from 'react'
import {
  createCellTypeRegistry,
  defineCellType,
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
  actionCellType,
  actionMenuCellType,
  qrCellType,
  barcodeCellType,
  richTextCellType,
  sanitizeHtml,
} from '@bloomskill/table-engine'
import type { CellTypeRegistry, BstColumnMeta, BstOption } from '@bloomskill/table-engine'
import TextField from '@mui/material/TextField'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Checkbox from '@mui/material/Checkbox'
import Switch from '@mui/material/Switch'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import ListItemText from '@mui/material/ListItemText'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import FormatBoldIcon from '@mui/icons-material/FormatBold'
import FormatItalicIcon from '@mui/icons-material/FormatItalic'
import FormatUnderlinedIcon from '@mui/icons-material/FormatUnderlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered'
import Box from '@mui/material/Box'

/* ------------------------------------------------------------------ helpers */

function cm(meta: BstColumnMeta): Record<string, any> {
  return (meta.cellMeta ?? {}) as Record<string, any>
}
function opts(meta: BstColumnMeta): BstOption[] {
  return meta.options ?? []
}
function optLabel(meta: BstColumnMeta, value: unknown): string {
  const o = opts(meta).find((x) => x.value === value)
  return o?.label ?? String(value ?? '')
}
function hrefOf(v: unknown): string {
  if (v && typeof v === 'object') {
    const o = v as { href?: string; url?: string }
    return o.href ?? o.url ?? ''
  }
  return v == null ? '' : String(v)
}

type DateVariant = 'date' | 'time' | 'dateTime'
function toInput(value: unknown, variant: DateVariant): string {
  if (variant === 'time') {
    if (typeof value === 'string' && /^\d{2}:\d{2}/.test(value)) return value.slice(0, 5)
    const d = value ? new Date(value as string) : null
    return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(11, 16) : ''
  }
  const d = value ? new Date(value as string) : null
  if (!d || Number.isNaN(d.getTime())) return ''
  return variant === 'dateTime' ? d.toISOString().slice(0, 16) : d.toISOString().slice(0, 10)
}
function fromInput(raw: string, variant: DateVariant): string | null {
  if (!raw) return null
  if (variant === 'time') return raw
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
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

const stdField = {
  variant: 'standard' as const,
  size: 'small' as const,
  fullWidth: true,
}

/* --------------------------------------------------------------- MUI editors */

const muiText = defineCellType<string>({
  ...textCellType,
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => (
    <TextField
      {...stdField}
      autoFocus={autoFocus}
      placeholder={meta.placeholder}
      value={draft ?? ''}
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
})

const muiLongText = defineCellType<string>({
  ...longTextCellType,
  editMode: 'popup',
  renderEdit: ({ draft, setDraft, commit, cancel, meta }) => (
    <Dialog open onClose={cancel} maxWidth="sm" fullWidth>
      <DialogTitle>Edit</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          multiline
          minRows={4}
          fullWidth
          margin="dense"
          placeholder={meta.placeholder}
          value={draft ?? ''}
          onChange={(e) => setDraft(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel}>Cancel</Button>
        <Button variant="contained" onClick={() => commit()}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  ),
})

const muiNumber = defineCellType<number | null>({
  ...numberCellType,
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => (
    <TextField
      {...stdField}
      type="number"
      autoFocus={autoFocus}
      placeholder={meta.placeholder}
      value={draft == null ? '' : String(draft)}
      onChange={(e) => setDraft(e.target.value === '' ? null : Number(e.target.value))}
    />
  ),
})

const muiDateTime = defineCellType<string | Date | null>({
  ...dateTimeCellType,
  renderEdit: ({ draft, setDraft, autoFocus, meta }) => {
    const variant: DateVariant = cm(meta).variant ?? 'date'
    const type = variant === 'time' ? 'time' : variant === 'dateTime' ? 'datetime-local' : 'date'
    return (
      <TextField
        {...stdField}
        type={type}
        autoFocus={autoFocus}
        value={toInput(draft, variant)}
        onChange={(e) => setDraft(fromInput(e.target.value, variant))}
      />
    )
  },
})

const muiBoolean = defineCellType<boolean>({
  ...booleanCellType,
  renderEdit: ({ draft, setDraft, commit, autoFocus, meta }) => {
    const Control = cm(meta).variant === 'switch' ? Switch : Checkbox
    return (
      <Control
        autoFocus={autoFocus}
        size="small"
        checked={!!draft}
        onChange={(e) => {
          setDraft(e.target.checked)
          commit(e.target.checked)
        }}
      />
    )
  },
})

const muiSingleSelect = defineCellType<string | null>({
  ...singleSelectCellType,
  // MUI's Select menu portals to <body> (outside the cell) — see CellType.overlayEditor.
  overlayEditor: true,
  renderEdit: ({ draft, setDraft, commit, meta, autoFocus }) => (
    <Select
      variant="standard"
      size="small"
      fullWidth
      autoFocus={autoFocus}
      // Open the menu immediately on a single-cell edit (autoFocus is false in a
      // row-session, where every cell renders an editor — we must not pop them all).
      defaultOpen={autoFocus}
      value={draft ?? ''}
      onChange={(e) => {
        const v = e.target.value === '' ? null : (e.target.value as string)
        setDraft(v)
        commit(v)
      }}
    >
      <MenuItem value="">
        <em>—</em>
      </MenuItem>
      {opts(meta).map((o) => (
        <MenuItem key={o.value} value={o.value} disabled={o.disabled}>
          {o.color ? (
            <span
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: o.color,
                marginRight: 8,
              }}
            />
          ) : null}
          {o.label ?? o.value}
        </MenuItem>
      ))}
    </Select>
  ),
})

const muiMultiSelect = defineCellType<string[]>({
  ...multiSelectCellType,
  // Same portalled-menu concern as single-select; commits the accumulated draft
  // when the menu closes (each item toggle keeps the menu open).
  overlayEditor: true,
  renderEdit: ({ draft, setDraft, commit, meta, autoFocus }) => {
    const arr = Array.isArray(draft) ? draft : []
    return (
      <Select
        variant="standard"
        size="small"
        fullWidth
        multiple
        autoFocus={autoFocus}
        defaultOpen={autoFocus}
        value={arr}
        onChange={(e) => {
          const v = e.target.value
          setDraft(typeof v === 'string' ? v.split(',') : (v as string[]))
        }}
        onClose={() => commit()}
        renderValue={(sel) => (sel as string[]).map((v) => optLabel(meta, v)).join(', ')}
      >
        {opts(meta).map((o) => (
          <MenuItem key={o.value} value={o.value}>
            <Checkbox size="small" checked={arr.indexOf(o.value) > -1} />
            {o.color ? (
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: o.color,
                  margin: '0 8px 0 2px',
                  flex: '0 0 auto',
                }}
              />
            ) : null}
            <ListItemText primary={o.label ?? o.value} />
          </MenuItem>
        ))}
      </Select>
    )
  },
})

const muiRadio = defineCellType<string | null>({
  ...radioCellType,
  renderEdit: ({ draft, setDraft, commit, meta }) => (
    <RadioGroup
      row={cm(meta).layout === 'horizontal'}
      value={draft ?? ''}
      onChange={(e) => {
        setDraft(e.target.value)
        commit(e.target.value)
      }}
    >
      {opts(meta).map((o) => (
        <FormControlLabel
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          control={<Radio size="small" />}
          label={o.label ?? o.value}
        />
      ))}
    </RadioGroup>
  ),
})

const muiHyperlink = defineCellType<unknown>({
  ...hyperlinkCellType,
  renderEdit: ({ draft, setDraft, autoFocus }) => (
    <TextField
      {...stdField}
      autoFocus={autoFocus}
      placeholder="https://…"
      value={hrefOf(draft)}
      onChange={(e) => setDraft(e.target.value)}
    />
  ),
})

const muiFiles = defineCellType<unknown>({
  ...filesCellType,
  editMode: 'popup',
  renderEdit: ({ draft, setDraft, commit, cancel }) => {
    const files = filesOf(draft)
    return (
      <Dialog open onClose={cancel} maxWidth="xs" fullWidth>
        <DialogTitle>Files</DialogTitle>
        <DialogContent>
          {files.length === 0 ? (
            <Box sx={{ color: 'text.secondary', py: 1 }}>No files</Box>
          ) : (
            files.map((f, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                <Box sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.name ?? f.url}
                </Box>
                <Button
                  size="small"
                  color="error"
                  onClick={() => setDraft(files.filter((_, j) => j !== i))}
                >
                  Remove
                </Button>
              </Box>
            ))
          )}
          <Button component="label" variant="outlined" size="small" sx={{ mt: 1 }}>
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
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancel}>Cancel</Button>
          <Button variant="contained" onClick={() => commit()}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    )
  },
})

/** All MUI cell types (neutral read renderers + MUI editors). */
function MuiRichTextEdit({
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
  const tb = (cmd: string, Icon: React.ElementType, title: string) => (
    <IconButton
      size="small"
      title={title}
      aria-label={title}
      onMouseDown={(e) => {
        e.preventDefault()
        exec(cmd)
      }}
    >
      <Icon fontSize="small" />
    </IconButton>
  )
  return (
    <Dialog open onClose={cancel} maxWidth="sm" fullWidth>
      <DialogTitle>Edit</DialogTitle>
      <DialogContent>
        <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
          {tb('bold', FormatBoldIcon, 'Bold')}
          {tb('italic', FormatItalicIcon, 'Italic')}
          {tb('underline', FormatUnderlinedIcon, 'Underline')}
          {tb('insertUnorderedList', FormatListBulletedIcon, 'Bulleted list')}
          {tb('insertOrderedList', FormatListNumberedIcon, 'Numbered list')}
        </div>
        <div
          ref={ref}
          contentEditable
          role="textbox"
          aria-multiline="true"
          style={{
            minHeight: 120,
            maxHeight: 280,
            overflow: 'auto',
            border: '1px solid rgba(128,128,128,0.4)',
            borderRadius: 4,
            padding: '8px 12px',
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel}>Cancel</Button>
        <Button variant="contained" onClick={() => commit(sanitizeHtml(ref.current?.innerHTML ?? ''))}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}

const muiRichText = defineCellType<string>({
  ...richTextCellType,
  editMode: 'popup',
  renderEdit: ({ draft, commit, cancel }) => (
    <MuiRichTextEdit draft={draft} commit={commit} cancel={cancel} />
  ),
})

export const muiCellTypes = [
  muiText,
  muiLongText,
  muiNumber,
  muiDateTime,
  muiBoolean,
  muiSingleSelect,
  muiMultiSelect,
  muiRadio,
  muiHyperlink,
  muiFiles,
  sparklineCellType,
  kpiCellType,
  qrCellType,
  barcodeCellType,
  muiRichText,
  actionCellType,
  actionMenuCellType,
]

/**
 * Build a registry with the MUI editors (Plan.md §2.6 — adapters own
 * `renderEdit`; read renderers stay the engine's neutral defaults). Pass the
 * result to `BstTableMui`/`useBstTable` as `cellTypes`.
 */
export function createMuiPreset(): CellTypeRegistry {
  return createCellTypeRegistry(muiCellTypes)
}
