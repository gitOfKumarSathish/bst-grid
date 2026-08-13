import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { ExampleEntry } from '../types.js'
import { codeSpans, parseTable, stripMd } from './md.js'

/**
 * Inlines the runnable apps under `examples/`. These are the highest-signal
 * content in the corpus: complete, compiling programs that import the published
 * packages exactly as a consumer would, so an agent can pattern-match against
 * working code instead of assembling one from prose.
 */
export function extractExamples(repoRoot: string): ExampleEntry[] {
  const root = join(repoRoot, 'examples')
  if (!existsSync(root)) return []

  const descriptions = exampleDescriptions(root)
  const out: ExampleEntry[] = []

  for (const name of readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort()) {
    const srcDir = join(root, name, 'src')
    if (!existsSync(srcDir)) continue

    const files: ExampleEntry['files'] = []
    for (const file of readdirSync(srcDir).sort()) {
      if (!/\.(tsx?|css)$/.test(file)) continue
      files.push({
        path: `examples/${name}/src/${file}`,
        code: readFileSync(join(srcDir, file), 'utf8'),
      })
    }
    if (!files.length) continue

    out.push({
      name,
      description: descriptions[name] ?? `The ${name} example`,
      files,
    })
  }
  return out
}

/** Reads the one-line blurbs from the `examples/README.md` "Example | Shows" table. */
function exampleDescriptions(examplesRoot: string): Record<string, string> {
  const readme = join(examplesRoot, 'README.md')
  if (!existsSync(readme)) return {}
  const table = parseTable(readFileSync(readme, 'utf8'), ['Example', 'Shows'])
  if (!table) return {}

  const out: Record<string, string> = {}
  for (const [nameCell = '', showsCell = ''] of table.rows) {
    const name = codeSpans(nameCell)[0] ?? stripMd(nameCell)
    if (name) out[name] = stripMd(showsCell)
  }
  return out
}
