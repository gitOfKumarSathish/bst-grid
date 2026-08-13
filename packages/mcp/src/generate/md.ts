/**
 * Small markdown helpers shared by the corpus extractors. Deliberately hand-rolled
 * rather than pulling a parser in: the sources are our own tables and headings,
 * and the MCP package must stay dependency-light (SDK + zod only).
 */

/** A parsed markdown table: its header cells plus its body rows. */
export interface MdTable {
  header: string[]
  rows: string[][]
}

/**
 * Splits one table line into cells on **unescaped** pipes, so a type like
 * `boolean \| {pageSize}` survives as a single cell.
 */
function splitRow(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '\\' && line[i + 1] === '|') {
      cur += '|'
      i++
      continue
    }
    if (ch === '|') {
      cells.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur)
  // A pipe table has leading/trailing delimiters producing empty edge cells.
  if (cells[0]?.trim() === '') cells.shift()
  if (cells[cells.length - 1]?.trim() === '') cells.pop()
  return cells.map((c) => c.trim())
}

const isDelimiterRow = (line: string): boolean => /^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/.test(line)

/**
 * Finds the first pipe table whose header row contains every string in
 * `headerContains` (case-insensitive substring match), and parses it.
 *
 * @returns the table, or `undefined` when no header matches.
 */
export function parseTable(markdown: string, headerContains: string[]): MdTable | undefined {
  const lines = markdown.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line?.includes('|')) continue
    const header = splitRow(line)
    const lower = header.map((h) => h.toLowerCase())
    const matches = headerContains.every((want) =>
      lower.some((h) => h.includes(want.toLowerCase())),
    )
    if (!matches) continue
    if (!isDelimiterRow(lines[i + 1] ?? '')) continue

    const rows: string[][] = []
    for (let j = i + 2; j < lines.length; j++) {
      const row = lines[j]
      if (!row || !row.includes('|')) break
      const cells = splitRow(row)
      if (cells.length < 2) break
      rows.push(cells)
    }
    return { header, rows }
  }
  return undefined
}

/** Like {@link parseTable} but returns every matching table in document order. */
export function parseAllTables(markdown: string, headerContains: string[]): MdTable[] {
  const out: MdTable[] = []
  let rest = markdown
  let guard = 0
  for (;;) {
    if (guard++ > 200) break
    const table = parseTable(rest, headerContains)
    if (!table) break
    out.push(table)
    // Advance past this table's header so the next call finds the following one.
    const headerLine = rest.split('\n').findIndex((l) => {
      if (!l.includes('|')) return false
      const cells = splitRow(l)
      return cells.length === table.header.length && cells[0] === table.header[0]
    })
    if (headerLine < 0) break
    rest = rest.split('\n').slice(headerLine + 1).join('\n')
  }
  return out
}

/** Strips markdown emphasis/code/link syntax, leaving readable plain text. */
export function stripMd(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** All backticked spans in a cell, in order — `` `a` / `b` `` → `['a', 'b']`. */
export function codeSpans(text: string): string[] {
  return [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1] ?? '').filter(Boolean)
}

/** True when a string is a bare JS identifier (so `enableFoo` passes, `meta.type: 'qr'` doesn't). */
export function isIdentifier(text: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(text)
}

/** GitHub-style heading anchor: lowercase, drop punctuation, spaces → hyphens. */
export function slugify(heading: string): string {
  return stripMd(heading)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

/** A markdown section: its heading ancestry and the body beneath it. */
export interface MdSection {
  level: number
  headingPath: string[]
  anchor: string
  text: string
}

/**
 * Splits markdown into sections on `#`/`##`/`###` headings, tracking heading
 * ancestry. Headings inside fenced code blocks are ignored — several of our
 * READMEs contain `# comment` lines inside ```tsx fences.
 */
export function sections(markdown: string, maxLevel = 3): MdSection[] {
  const lines = markdown.split('\n')
  const out: MdSection[] = []
  const stack: string[] = []
  let current: MdSection | undefined
  let inFence = false

  const flush = (): void => {
    if (current && current.text.trim()) out.push({ ...current, text: current.text.trim() })
    current = undefined
  }

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    const heading = inFence ? null : line.match(/^(#{1,6})\s+(.*)$/)

    if (heading) {
      const level = heading[1]?.length ?? 1
      const title = (heading[2] ?? '').trim()
      if (level <= maxLevel) {
        flush()
        stack.length = Math.max(0, level - 1)
        stack[level - 1] = title
        const headingPath = stack.slice(0, level).filter(Boolean) as string[]
        current = { level, headingPath, anchor: slugify(title), text: '' }
        continue
      }
    }
    if (current) current.text += `${line}\n`
  }
  flush()
  return out
}
