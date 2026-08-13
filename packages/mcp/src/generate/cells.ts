import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CellTypeEntry } from '../types.js'
import { codeSpans, parseTable, sections, stripMd } from './md.js'

/**
 * Extracts the cell-type catalogue from the engine README's "Cell types" table,
 * then enriches each type with its `cellMeta` fields from the following
 * "`cellMeta` by cell type" section (one small table per type, introduced by a
 * bold **`type`** line).
 *
 * `meta.type` is how every renderer/editor is chosen, so getting an agent the
 * exact type name *and* its value shape is what makes generated columns work.
 */
export function extractCellTypes(repoRoot: string): CellTypeEntry[] {
  const md = readFileSync(join(repoRoot, 'packages/engine/README.md'), 'utf8')

  const table = parseTable(md, ['meta.type', 'Renders', 'Value shape', 'Editable'])
  if (!table) throw new Error('Could not find the engine README "Cell types" table')

  const detail = cellMetaByType(md)

  const out: CellTypeEntry[] = []
  for (const row of table.rows) {
    const [typeCell = '', renders = '', valueShape = '', editable = '', cellMeta = ''] = row
    // The cell is like `` `text` *(default)* `` — the code span is the type name.
    const type = codeSpans(typeCell)[0] ?? stripMd(typeCell)
    if (!type) continue
    out.push({
      type,
      renders: stripMd(renders),
      valueShape: stripMd(valueShape),
      editable: stripMd(editable),
      cellMeta: stripMd(cellMeta),
      ...(detail[type] ? { cellMetaDetail: detail[type] } : {}),
    })
  }
  if (!out.length) throw new Error('Engine README "Cell types" table parsed to zero types')
  return out
}

/**
 * Maps a cell type to the raw markdown of its `cellMeta` table. The section
 * lists types as bold code lines (**`number`** — …) each followed by a table, so
 * we walk the section body and attribute each table to the last type named.
 */
function cellMetaByType(md: string): Record<string, string> {
  const section = sections(md).find((s) => s.headingPath.at(-1)?.includes('cellMeta'))
  if (!section) return {}

  const out: Record<string, string> = {}
  let current: string | undefined
  for (const line of section.text.split('\n')) {
    const bold = line.match(/^\*\*`([^`]+)`\*\*/)
    if (bold?.[1]) {
      current = bold[1]
      out[current] = line.trim()
      continue
    }
    if (current && line.trim()) out[current] += `\n${line.trim()}`
    else if (current && !line.trim() && out[current]?.endsWith('|')) current = undefined
  }
  return out
}
