import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { RequirementEntry } from '../types.js'
import { parseTable, stripMd } from './md.js'

/**
 * Extracts the 58 spec leaves from `COVERAGE.md`.
 *
 * This is the corpus's most important guard rail. Bst-Table's coverage is high
 * but not total — virtualization (D1) and live/WebSocket merge (I5) do not exist,
 * and five more leaves are partial. Without these rows an agent will happily
 * invent a `virtualized` prop, because every *other* signal says "this grid does
 * everything". The "Where / why" column carries the documented workaround.
 */
export function extractRequirements(repoRoot: string): RequirementEntry[] {
  const md = readFileSync(join(repoRoot, 'COVERAGE.md'), 'utf8')
  const table = parseTable(md, ['ID', 'Requirement', 'Status'])
  if (!table) throw new Error('Could not find the COVERAGE.md status matrix table')

  const out: RequirementEntry[] = []
  for (const row of table.rows) {
    const [idCell = '', titleCell = '', statusCell = '', notesCell = ''] = row
    const id = stripMd(idCell)
    // Section separators inside the table ("**B. Column Types**") aren't leaves.
    if (!/^[A-M]\d{1,2}$/.test(id)) continue
    out.push({
      id,
      title: stripMd(titleCell),
      status: statusCell.includes('✅') ? 'built' : statusCell.includes('🟡') ? 'partial' : 'missing',
      notes: stripMd(notesCell),
    })
  }
  if (!out.length) throw new Error('COVERAGE.md matrix parsed to zero requirement leaves')
  return out
}
