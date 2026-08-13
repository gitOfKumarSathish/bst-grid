import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ApiEntry } from '../types.js'

/**
 * Reads the engine's public API off its **built** type declarations
 * (`dist/index.d.ts` plus the modules it re-exports), so signatures are exactly
 * what a consumer's editor sees — not a paraphrase that can drift.
 */
export function extractApi(repoRoot: string): ApiEntry[] {
  const distDir = join(repoRoot, 'packages/engine/dist')
  const indexDts = join(distDir, 'index.d.ts')
  if (!existsSync(indexDts)) {
    throw new Error(
      `Missing ${indexDts}. Build the engine first: npm run build -w @bloomskill/table-engine`,
    )
  }

  const index = readFileSync(indexDts, 'utf8')
  const exported = exportedNames(index)

  // Collect declarations from every .d.ts the barrel re-exports from.
  const byName = new Map<string, ApiEntry>()
  for (const rel of referencedModules(index)) {
    const file = join(distDir, rel.replace(/\.js$/, '.d.ts'))
    if (!existsSync(file)) continue
    for (const entry of declarations(readFileSync(file, 'utf8'))) {
      if (exported.has(entry.symbol) && !byName.has(entry.symbol)) byName.set(entry.symbol, entry)
    }
  }
  // Anything declared directly in the barrel.
  for (const entry of declarations(index)) {
    if (!byName.has(entry.symbol)) byName.set(entry.symbol, entry)
  }

  // Names re-exported but whose declaration we could not locate still deserve a
  // stub — knowing a symbol exists is better than the agent assuming it doesn't.
  for (const name of exported) {
    if (!byName.has(name)) {
      byName.set(name, { symbol: name, kind: 'unknown', signature: `export { ${name} }` })
    }
  }

  return [...byName.values()].sort((a, b) => a.symbol.localeCompare(b.symbol))
}

/** Every name the barrel re-exports, from `export { a, b as c } from '...'` clauses. */
function exportedNames(dts: string): Set<string> {
  const names = new Set<string>()
  for (const clause of dts.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
    for (const part of (clause[1] ?? '').split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()?.trim()
      if (name) names.add(name)
    }
  }
  for (const decl of dts.matchAll(/export\s+(?:declare\s+)?(?:function|const|class|interface|type)\s+([A-Za-z_$][\w$]*)/g)) {
    if (decl[1]) names.add(decl[1])
  }
  return names
}

/** Relative module specifiers the barrel re-exports from. */
function referencedModules(dts: string): string[] {
  return [...dts.matchAll(/from\s+'(\.[^']+)'/g)].map((m) => m[1] ?? '').filter(Boolean)
}

/**
 * Pulls top-level declarations with their leading TSDoc out of a `.d.ts`.
 * A declaration runs to the first line that ends its statement at column 0 —
 * enough for the single-line signatures `tsc` emits for functions and consts,
 * and for whole `interface`/`type` bodies.
 */
function declarations(dts: string): ApiEntry[] {
  const out: ApiEntry[] = []
  const re =
    /(?:\/\*\*([\s\S]*?)\*\/\s*)?declare\s+(function|const|class|interface|type)\s+([A-Za-z_$][\w$]*)([\s\S]*?)(?=\n(?:\/\*\*|declare|export|$))/g

  for (const match of dts.matchAll(re)) {
    const [, rawDoc, kind = 'unknown', symbol = '', rest = ''] = match
    if (!symbol) continue
    const signature = `${kind} ${symbol}${rest}`.replace(/\s+$/, '')
    const doc = rawDoc
      ?.split('\n')
      .map((line) => line.replace(/^\s*\*\s?/, '').trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    out.push({
      symbol,
      kind: kind as ApiEntry['kind'],
      signature: signature.length > 2000 ? `${signature.slice(0, 2000)}\n// …truncated` : signature,
      ...(doc ? { doc } : {}),
    })
  }
  return out
}
