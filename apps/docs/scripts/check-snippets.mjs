#!/usr/bin/env node
/**
 * check-snippets.mjs — compile every ```tsx / ```jsx fence in the docs.
 *
 * Docs snippets rot silently: a renamed prop or a wrong option name sails
 * through Markdown untouched, and a reader copy-pastes something that no longer
 * compiles. This script makes every fenced tsx/jsx example a compiler-checked
 * unit so a wrong prop name is a build failure, not a support ticket.
 *
 *   scans   : apps/docs/docs/**\/*.mdx  +  apps/docs/guides/**\/*.mdx
 *   extracts: every ```tsx and ```jsx fence
 *   skips   : fences whose info string contains `no-check` (intentional fragments)
 *   checks  : type-checks each fence against the workspace BUILD OUTPUT
 *             (packages/*\/dist/*.d.ts) — the real, compiled library a reader would
 *             `npm install`. Each fence is its OWN program (a fence never sees the
 *             identifiers of another), so an undeclared `rows`/`columns` fails
 *             rather than silently resolving to a neighbour's declaration.
 *   fails   : with the origin file, line and the tsc error for every failure.
 *
 * A fence is treated as a STANDALONE module. Illustrative fragments that lean on
 * identifiers declared elsewhere (a bare `<BstTableMui data={rows} …/>`) should
 * be tagged `no-check` — do not pad them into compiling; tag them. Complete,
 * copy-pasteable examples must compile.
 *
 * Prerequisite: the packages must be built (packages/*\/dist present). Run
 * `npm run build` at the repo root first. The script says so if they are missing.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { dirname, resolve, relative, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url)) // apps/docs/scripts
const DOCS = resolve(HERE, '..') // apps/docs
const ROOT = resolve(HERE, '../../..') // repo root
const SCAN_ROOTS = [resolve(DOCS, 'docs'), resolve(DOCS, 'guides')]
const TMP = join(tmpdir(), 'bst-docs-snippets')

// TypeScript is the docs' pinned devDependency (v5). Load it from apps/docs.
const require = createRequire(join(DOCS, 'package.json'))
let ts
try {
  ts = require('typescript')
} catch {
  console.error('check-snippets — TypeScript not found.\nRun: npm --prefix apps/docs install --no-workspaces')
  process.exit(2)
}

// ---- packages must be built so @bloomskill/* resolves to real .d.ts ---------
const PKG_TYPES = {
  '@bloomskill/table-engine': resolve(ROOT, 'packages/engine/dist/index.d.ts'),
  '@bloomskill/table-mui': resolve(ROOT, 'packages/mui/dist/index.d.ts'),
  '@bloomskill/table-shadcn': resolve(ROOT, 'packages/shadcn/dist/index.d.ts'),
}
const missing = Object.entries(PKG_TYPES).filter(([, p]) => !existsSync(p))
if (missing.length) {
  console.error(
    'check-snippets — the workspace build output is missing, so snippets cannot be checked against the real library:\n' +
      missing.map(([n, p]) => `  ${n} → ${relative(ROOT, p)}`).join('\n') +
      '\nBuild first: npm run build',
  )
  process.exit(2)
}

// ---- walk for .mdx ----------------------------------------------------------
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.mdx') || p.endsWith('.md')) out.push(p)
  }
  return out
}

// ---- extract fences ---------------------------------------------------------
// Returns { lang, meta, code, startLine } for every fenced block. `startLine`
// is the 1-based line of the first CODE line (the line after the opening ```),
// so a diagnostic at snippet line L maps to origin line startLine + L - 1.
function extractFences(text) {
  const lines = text.split('\n')
  const fences = []
  let open = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/^(\s*)```([^\n]*)$/)
    if (open) {
      if (m && m[1] === open.indent && m[2].trim() === '') {
        open.code = open.buf.join('\n')
        fences.push(open)
        open = null
      } else {
        open.buf.push(line)
      }
    } else if (m) {
      const info = m[2].trim()
      const lang = info.split(/\s+/)[0] || ''
      open = { lang, meta: info.slice(lang.length).trim(), indent: m[1], buf: [], startLine: i + 2 }
    }
  }
  return fences
}

// ---- collect checkable snippets ---------------------------------------------
const files = SCAN_ROOTS.filter(existsSync).flatMap(walk).sort()
let totalFences = 0
let skipped = 0
const snippets = [] // { id, file, startLine, code, path }
for (const file of files) {
  const fences = extractFences(readFileSync(file, 'utf8'))
  for (const f of fences) {
    if (f.lang !== 'tsx' && f.lang !== 'jsx') continue
    totalFences++
    if (/\bno-check\b/.test(f.meta)) { skipped++; continue }
    const id = snippets.length
    snippets.push({ id, file, startLine: f.startLine, code: f.code, path: join(TMP, `snippet_${id}.tsx`) })
  }
}

// ---- materialise temp files -------------------------------------------------
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })
for (const s of snippets) writeFileSync(s.path, s.code)
const GLOBALS = join(TMP, 'globals.d.ts')
// Ambient shims: CSS side-effect imports, and the documented PEER dependencies a
// reader already has installed (MUI, Emotion, Radix, icon packs) but which are not
// installed for this checker. Shimming them to `any` keeps a complete example
// checkable for its Bst-Table surface without vendoring every peer's types.
writeFileSync(
  GLOBALS,
  [
    "declare module '*.css'",
    "declare module '@mui/material'",
    "declare module '@mui/material/*'",
    "declare module '@mui/icons-material'",
    "declare module '@mui/icons-material/*'",
    "declare module '@emotion/react'",
    "declare module '@emotion/styled'",
    "declare module '@radix-ui/*'",
    "declare module 'lucide-react'",
    "declare module '@tabler/icons-react'",
    "declare module '@phosphor-icons/react'",
    '',
  ].join('\n'),
)

if (snippets.length === 0) {
  console.log(`check-snippets: 0 checkable fences (${skipped} tagged no-check). Nothing to do.`)
  process.exit(0)
}

// ---- compiler options -------------------------------------------------------
const { options: compilerOptions, errors: optErrors } = ts.convertCompilerOptionsFromJson(
  {
    target: 'ES2020',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'Bundler',
    jsx: 'react-jsx',
    strict: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    noEmit: true,
    baseUrl: TMP,
    typeRoots: [resolve(ROOT, 'node_modules/@types')],
    types: ['react', 'react-dom'],
    paths: {
      ...Object.fromEntries(Object.entries(PKG_TYPES).map(([n, p]) => [n, [p]])),
      '@bloomskill/table-shadcn/icons/*': [resolve(ROOT, 'packages/shadcn/dist/icons/*')],
    },
  },
  TMP,
)
if (optErrors.length) {
  console.error('check-snippets — bad compilerOptions:\n' + optErrors.map((e) => e.messageText).join('\n'))
  process.exit(2)
}

// Shared host with a source-file cache: the library .d.ts and lib files are
// parsed ONCE and reused across every per-snippet program, so checking 100+
// fences stays fast while each fence is still its own isolated program.
const host = ts.createCompilerHost(compilerOptions, true)
const sfCache = new Map()
const baseGetSourceFile = host.getSourceFile.bind(host)
host.getSourceFile = (fileName, languageVersionOrOptions, onError, shouldCreate) => {
  const cached = sfCache.get(fileName)
  if (cached) return cached
  const sf = baseGetSourceFile(fileName, languageVersionOrOptions, onError, shouldCreate)
  if (sf) sfCache.set(fileName, sf)
  return sf
}

// ---- check each snippet in its own program ----------------------------------
const failures = [] // { snippet, diags: [{line,msg}] }
let prevProgram
for (const s of snippets) {
  const program = ts.createProgram([s.path, GLOBALS], compilerOptions, host, prevProgram)
  prevProgram = program
  const diags = ts
    .getPreEmitDiagnostics(program)
    .filter((d) => d.file && resolve(d.file.fileName) === resolve(s.path))
  if (!diags.length) continue
  const rows = diags.map((d) => {
    const { line } = d.file.getLineAndCharacterOfPosition(d.start ?? 0)
    return {
      originLine: s.startLine + line,
      code: `TS${d.code}`,
      msg: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      snippetLine: s.code.split('\n')[line],
    }
  })
  failures.push({ snippet: s, rows })
}

// ---- report -----------------------------------------------------------------
const bar = '─'.repeat(72)
if (failures.length) {
  console.log(`\n${bar}\ncheck-snippets — FAILURES\n${bar}`)
  for (const { snippet, rows } of failures) {
    const rel = relative(ROOT, snippet.file)
    console.log(`\n✗ ${rel}  (fence at line ${snippet.startLine})`)
    for (const r of rows) {
      console.log(`  ${rel}:${r.originLine}  error ${r.code}: ${r.msg.split('\n')[0]}`)
      if (r.snippetLine != null) console.log(`      | ${r.snippetLine.trim()}`)
    }
  }
}
const passed = snippets.length - failures.length
console.log(`\n${bar}`)
console.log(
  `check-snippets: ${totalFences} tsx/jsx fences — ${passed} passed · ${failures.length} failed · ${skipped} tagged no-check`,
)
console.log(bar)
if (!process.env.KEEP_SNIPPETS) rmSync(TMP, { recursive: true, force: true })
process.exit(failures.length ? 1 : 0)
