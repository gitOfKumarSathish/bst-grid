#!/usr/bin/env node
/**
 * dump-llms.mjs — generate `llms.txt` + `llms-full.txt` for AI tools.
 *
 * A growing convention (llmstxt.org): a site exposes a clean, plain-text view of
 * its docs so an AI assistant can read the real content instead of scraping messy
 * HTML (nav, sidebars, JS). We emit two files into `static/` (served at the site
 * root):
 *
 *   llms.txt       — a short INDEX: title + URL (+ one-line summary) per page,
 *                    grouped by section. The "menu".
 *   llms-full.txt  — the WHOLE docs corpus as clean plain text, page by page.
 *                    The "full book".
 *
 * Runs LAST in `gen:docs` (after gen:features + gen:reference) so every generated
 * page already exists. Build artifacts — never hand-edit; `docs:build` overwrites.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url)) // apps/docs/scripts
const DOCS = join(HERE, '..', 'docs')
const STATIC = join(HERE, '..', 'static')

// Site base + docs route, read from the real Docusaurus config so URLs stay correct
// if the deploy target changes. routeBasePath is 'docs' (config presets.docs).
const require = createRequire(import.meta.url)
let SITE = 'https://gitofkumarsathish.github.io/bst-grid'
try {
  const cfg = require('../docusaurus.config.js')
  SITE = `${cfg.url}${cfg.baseUrl}`.replace(/\/+$/, '')
} catch {
  /* isolated run — fall back to the known deploy URL */
}
const DOCS_BASE = `${SITE}/docs`

const TAGLINE =
  'A headless React data grid: a TanStack Table v9 engine with swappable Material UI and ' +
  'shadcn/Radix skins. MIT/Apache only — no per-seat licensing. Pass data + columns for sorting, ' +
  'search, pagination and column controls out of the box; opt into editing, selection, clipboard ' +
  'and export with per-instance flags.'

// ---- walk -------------------------------------------------------------------
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (p.endsWith('.mdx') || p.endsWith('.md')) out.push(p)
  }
  return out
}

// ---- frontmatter + body -----------------------------------------------------
function parse(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/)
  const fm = {}
  if (m) {
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/)
      if (kv) fm[kv[1]] = kv[2].trim()
    }
  }
  return { fm, body: m ? text.slice(m[0].length) : text }
}

// Turn MDX page body into clean plain text: drop imports and JSX components,
// unescape the MDX-safety entities, unwrap admonitions, tidy blank lines.
function cleanBody(body) {
  const lines = body.split('\n')
  const out = []
  for (const line of lines) {
    if (/^\s*import\s.+from\s/.test(line)) continue // import statements
    if (/^\s*<[A-Za-z][^>]*\/>\s*$/.test(line)) continue // self-closing components e.g. <BstSandbox/>
    if (/^\s*<\/?(details|summary|BrowserOnly)[^>]*>\s*$/.test(line)) continue
    const adm = line.match(/^:::+\s*\w*\s*(.*)$/) // ::: admonition markers → keep any inline title
    if (adm) { if (adm[1].trim()) out.push(adm[1].trim()); continue }
    out.push(line)
  }
  return out
    .join('\n')
    .replace(/&#123;/g, '{').replace(/&#125;/g, '}')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/```(tsx|jsx)\s+no-check/g, '```$1') // drop the checker meta from fences
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

const titleOf = (fm, body) =>
  fm.title || (body.match(/^#\s+(.+)$/m)?.[1] ?? '').replace(/`/g, '').trim() || fm.id || 'Untitled'

// First real prose PARAGRAPH (wrapped lines joined), not a heading/table/fence/
// list/quote/image/component. Markdown stripped, truncated to one tidy line.
const isProse = (l) =>
  l && !/^[#>|]/.test(l) && !/^[-*]\s/.test(l) && !l.startsWith('```') && !l.startsWith('![') && !/^<[A-Za-z]/.test(l)
function summaryOf(body) {
  const para = []
  for (const raw of cleanBody(body).split('\n')) {
    const line = raw.trim()
    if (!para.length) { if (isProse(line)) para.push(line); continue }
    if (isProse(line)) para.push(line)
    else break // paragraph ends at the first blank / non-prose line
  }
  const text = para
    .join(' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*`_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > 150 ? text.slice(0, 147).trimEnd() + '…' : text
}

function routeOf(relPath, fm) {
  let r
  if (fm.slug) r = fm.slug.startsWith('/') ? fm.slug : `/${fm.slug}`
  else r = `/${relPath.replace(/\.mdx?$/, '').replace(/\/index$/, '')}`
  return `${DOCS_BASE}${r}`
}

function sectionOf(relPath) {
  if (relPath.startsWith('features/')) return 'Feature Guides'
  if (relPath.startsWith('cell-types/')) return 'Cell Types'
  if (relPath.startsWith('api/')) return 'API Reference'
  if (relPath === 'coverage.mdx') return 'Reference'
  return 'Guides'
}

// ---- collect ----------------------------------------------------------------
const pages = walk(DOCS)
  .map((abs) => {
    const relPath = relative(DOCS, abs).split('\\').join('/')
    const { fm, body } = parse(readFileSync(abs, 'utf8'))
    return {
      relPath,
      section: sectionOf(relPath),
      title: titleOf(fm, body),
      summary: summaryOf(body),
      url: routeOf(relPath, fm),
      body: cleanBody(body),
    }
  })
  .sort((a, b) => a.url.localeCompare(b.url))

// Curated order for the hand-written top-level guides; everything else by URL.
const GUIDE_ORDER = ['getting-started', 'installation', 'recipes', 'customization', 'theming', 'migration', 'ai-agents']
const guideRank = (p) => {
  const base = p.relPath.replace(/\.mdx?$/, '')
  const i = GUIDE_ORDER.indexOf(base)
  return i === -1 ? GUIDE_ORDER.length : i
}

const SECTION_ORDER = ['Guides', 'Feature Guides', 'Cell Types', 'API Reference', 'Reference']
const bySection = {}
for (const p of pages) (bySection[p.section] = bySection[p.section] || []).push(p)
for (const s of Object.keys(bySection)) {
  bySection[s].sort((a, b) => (s === 'Guides' ? guideRank(a) - guideRank(b) : a.url.localeCompare(b.url)))
}

// ---- llms.txt (index) -------------------------------------------------------
const idx = [`# Bst-Table`, '', `> ${TAGLINE}`, '',
  `This is the AI-readable index. Full plain-text docs: ${SITE}/llms-full.txt`, '']
for (const s of SECTION_ORDER) {
  const items = bySection[s]
  if (!items?.length) continue
  idx.push(`## ${s}`, '')
  for (const p of items) idx.push(`- [${p.title}](${p.url})${p.summary ? `: ${p.summary}` : ''}`)
  idx.push('')
}

// ---- llms-full.txt (whole corpus) ------------------------------------------
const full = [`# Bst-Table — full documentation`, '', `> ${TAGLINE}`, '',
  `Source: ${DOCS_BASE} · Generated from the docs site. Index: ${SITE}/llms.txt`, '']
for (const s of SECTION_ORDER) {
  const items = bySection[s]
  if (!items?.length) continue
  for (const p of items) {
    full.push('', '='.repeat(80), `# ${p.title}`, `URL: ${p.url}`, '='.repeat(80), '', p.body, '')
  }
}

mkdirSync(STATIC, { recursive: true })
writeFileSync(join(STATIC, 'llms.txt'), idx.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n')
writeFileSync(join(STATIC, 'llms-full.txt'), full.join('\n').replace(/\n{4,}/g, '\n\n\n').trim() + '\n')

const kb = (s) => Math.round(Buffer.byteLength(s) / 1024)
console.log(
  `llms: ${pages.length} pages → static/llms.txt (${kb(idx.join('\n'))} KB) · ` +
    `static/llms-full.txt (${kb(full.join('\n'))} KB)`,
)
