#!/usr/bin/env node
/**
 * Release-state guard — run before `npm publish`.
 *
 * `npm run release` builds from the WORKING TREE, not from the commit that set
 * the version. So anything landing between the version bump and the publish
 * ships silently under the old number. That happened for real in 0.47.0: the
 * bump commit was mirrored to GitHub Packages, a feature commit landed four
 * minutes later, and the npm publish 80 minutes after that shipped the extra
 * feature under the same version — leaving two different artifacts with one
 * version number.
 *
 * Two checks close it:
 *   1. The working tree is clean (nothing uncommitted can reach the tarball).
 *   2. HEAD *is* the commit that last touched `version.ini` — so no content has
 *      landed since the bump.
 * Plus a consistency check that every package.json matches `version.ini`.
 *
 * Bypass for a deliberate re-publish with `--allow-dirty` (say, re-running a
 * publish that failed partway).
 */
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const allowDirty = process.argv.includes('--allow-dirty')
const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim()
const fail = (msg, fix) => {
  console.error(`\n✖ release blocked — ${msg}`)
  if (fix) console.error(`  ${fix}`)
  process.exit(1)
}

// version.ini is the single source of truth (CLAUDE.md §13).
const ini = readFileSync(new URL('../version.ini', import.meta.url), 'utf8')
const version = ini.match(/^version\s*=\s*(.+)$/m)?.[1]?.trim()
if (!version) fail('could not read the version from version.ini')

// 1. Clean tree — `git status --porcelain` covers staged, unstaged and
//    untracked (a new untracked source file would still be compiled into dist).
const dirty = sh('git status --porcelain')
if (dirty && !allowDirty) {
  fail(
    'the working tree is not clean, so the published tarball would not match any commit.',
    `Commit or stash first:\n${dirty.split('\n').map((l) => `    ${l}`).join('\n')}`,
  )
}

// 2. HEAD must be the bump commit. If commits landed after it, their content
//    would ship under this version — the 0.47.0 failure exactly.
const bumpCommit = sh('git log -1 --format=%H -- version.ini')
const head = sh('git rev-parse HEAD')
if (bumpCommit && head !== bumpCommit && !allowDirty) {
  const extra = sh(`git log --oneline ${bumpCommit}..HEAD`)
  fail(
    `HEAD is not the commit that set version ${version}.`,
    `These landed after the bump and would ship as ${version}:\n` +
      `${extra.split('\n').map((l) => `    ${l}`).join('\n')}\n` +
      `  Bump again (npm run version:patch|minor|major) so they get their own version.`,
  )
}

// 3. Every package must carry the version.ini version.
const pkgs = ['engine', 'mui', 'shadcn', 'mcp']
const mismatched = pkgs
  .map((p) => {
    const j = JSON.parse(
      readFileSync(new URL(`../packages/${p}/package.json`, import.meta.url), 'utf8'),
    )
    return j.version === version ? null : `${j.name} is ${j.version}`
  })
  .filter(Boolean)
if (mismatched.length) {
  fail(
    `package versions disagree with version.ini (${version}): ${mismatched.join(', ')}.`,
    'Run: npm run version:patch (or minor/major) to resync.',
  )
}

console.log(
  `✔ release state — v${version}, clean tree, HEAD is the bump commit, all 4 packages in lockstep`,
)
