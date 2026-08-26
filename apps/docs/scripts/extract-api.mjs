// extract-api.mjs — enumerate the public exports of @bloomskill/table-engine
// from its built .d.ts and capture each one's signature text + JSDoc.
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const ts = require('typescript')
import { writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
// The engine's built .d.ts: a CLI arg wins, else the workspace-linked package,
// else the monorepo's packages/engine. Build the engine first
// (npm run build -w @bloomskill/table-engine) so dist/*.d.ts exist.
const entry = [
  process.argv[2],
  'node_modules/@bloomskill/table-engine/dist/index.d.ts',
  resolve(HERE, '../../../node_modules/@bloomskill/table-engine/dist/index.d.ts'),
  resolve(HERE, '../../../packages/engine/dist/index.d.ts'),
].filter(Boolean).find((p) => existsSync(p))
if (!entry) {
  console.error('extract-api: engine .d.ts not found — build the engine or pass a path arg.')
  process.exit(1)
}
const program = ts.createProgram([entry], {
  target: ts.ScriptTarget.ESNext,
  module: ts.ModuleKind.ESNext,
  declaration: true,
  skipLibCheck: true,
})
const checker = program.getTypeChecker()
const src = program.getSourceFile(entry)
const moduleSym = checker.getSymbolAtLocation(src)
const exports = moduleSym ? checker.getExportsOfModule(moduleSym) : []

const KIND = (decl) => {
  if (ts.isFunctionDeclaration(decl)) return 'function'
  if (ts.isInterfaceDeclaration(decl)) return 'interface'
  if (ts.isTypeAliasDeclaration(decl)) return 'type'
  if (ts.isClassDeclaration(decl)) return 'class'
  if (ts.isEnumDeclaration(decl)) return 'enum'
  if (ts.isVariableDeclaration(decl)) return 'const'
  return 'unknown'
}

// A signature short enough for a reference table; interfaces/types kept whole
// (they ARE the doc), functions/consts trimmed to their declaration line(s).
const sigText = (decl) => {
  let text = decl.getText(decl.getSourceFile())
  // strip leading JSDoc if the node text captured it
  text = text.replace(/^\/\*\*[\s\S]*?\*\/\s*/, '')
  return text.trim()
}

const jsdoc = (sym, decl) => {
  const parts = sym.getDocumentationComment(checker)
  const txt = ts.displayPartsToString(parts).trim()
  if (txt) return txt
  // fall back to raw leading comment
  const full = decl.getFullText(decl.getSourceFile())
  const m = full.match(/\/\*\*([\s\S]*?)\*\//)
  if (!m) return ''
  return m[1].split('\n').map((l) => l.replace(/^\s*\*?/, '').trim()).filter(Boolean).join(' ')
}

const out = []
const seen = new Set()
for (const sym of exports) {
  const name = sym.getName()
  let decls = sym.getDeclarations() || []
  // resolve alias re-exports (export { X } from '...')
  if ((sym.flags & ts.SymbolFlags.Alias) && checker.getAliasedSymbol) {
    try {
      const target = checker.getAliasedSymbol(sym)
      if (target?.getDeclarations()?.length) decls = target.getDeclarations()
    } catch {}
  }
  const decl = decls[0]
  if (!decl) { if (!seen.has(name)) { out.push({ symbol: name, kind: 'unknown', signature: '', doc: '' }); seen.add(name) } continue }
  if (seen.has(name)) continue
  seen.add(name)
  let sig = sigText(decl)
  // for variable consts the declaration node may be the VariableDeclaration; prefix
  if (ts.isVariableDeclaration(decl)) sig = 'const ' + sig
  // cap absurdly long bodies but keep interfaces/types readable
  if (sig.length > 1600) sig = sig.slice(0, 1600) + '\n  // …truncated'
  out.push({ symbol: name, kind: KIND(decl), signature: sig, doc: jsdoc(sym, decl) })
}

out.sort((a, b) => a.symbol.localeCompare(b.symbol))
writeFileSync(join(HERE, 'api-sigs.json'), JSON.stringify(out, null, 2))
const k = {}
let withSig = 0, withDoc = 0
for (const e of out) { k[e.kind] = (k[e.kind] || 0) + 1; if (e.signature) withSig++; if (e.doc) withDoc++ }
console.log('exports:', out.length, '| with signature:', withSig, '| with doc:', withDoc)
console.log('kinds:', JSON.stringify(k))
