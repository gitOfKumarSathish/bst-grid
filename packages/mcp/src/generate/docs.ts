import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { BstPackage, DocChunk } from '../types.js'
import { sections, slugify } from './md.js'

/** One markdown README, keyed to the package it belongs to. */
interface DocSource {
  path: string
  pkg: BstPackage
}

/** The package + repo READMEs, each tagged with its package. */
const README_SOURCES: DocSource[] = [
  { path: 'README.md', pkg: 'root' },
  { path: 'examples/README.md', pkg: 'docs' },
  { path: 'packages/engine/README.md', pkg: 'engine' },
  { path: 'packages/mui/README.md', pkg: 'mui' },
  { path: 'packages/shadcn/README.md', pkg: 'shadcn' },
  { path: 'packages/mcp/README.md', pkg: 'mcp' },
]

/**
 * The full set of markdown files the corpus indexes: the READMEs above **plus
 * every `docs/*.md`**, discovered by glob so a new guide indexes itself with no
 * code change (including this MCP server's own `docs/mcp-server.md`). Exported so
 * the generator can record these exact paths for the freshness guard.
 */
export function docSources(repoRoot: string): DocSource[] {
  const sources = [...README_SOURCES]
  const docsDir = join(repoRoot, 'docs')
  if (existsSync(docsDir)) {
    for (const file of readdirSync(docsDir).sort()) {
      if (file.endsWith('.md')) sources.push({ path: `docs/${file}`, pkg: 'docs' })
    }
  }
  return sources
}

/**
 * Chunks the package docs on `##`/`###` boundaries. The READMEs are already
 * cleanly sectioned ("Batch editing and single-call save", "Server mode
 * (DataSource)", …), so heading structure gives semantically whole chunks for
 * free — no sliding window, no overlap heuristics.
 *
 * Each chunk keeps its heading ancestry and anchor, so a search hit cites
 * `packages/engine/README.md#batch-editing-and-single-call-save` and the agent
 * can point a human at the exact section.
 */
export function extractDocs(repoRoot: string): DocChunk[] {
  const out: DocChunk[] = []

  for (const { path, pkg } of docSources(repoRoot)) {
    const abs = join(repoRoot, path)
    if (!existsSync(abs)) continue
    const md = readFileSync(abs, 'utf8')

    for (const section of sections(md)) {
      // The top-level title section (just a package name + badges) carries no
      // answer; its children do.
      if (section.headingPath.length < 2 && section.text.length < 200) continue
      out.push({
        id: `${pkg}/${slugify(section.headingPath.join(' '))}`,
        source: path,
        pkg,
        headingPath: section.headingPath,
        anchor: section.anchor,
        text: section.text,
      })
    }
  }

  if (!out.length) throw new Error('No documentation chunks were extracted')
  return out
}
