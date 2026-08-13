#!/usr/bin/env node
/**
 * Compiles every `bst_scaffold_grid` output against the REAL built packages.
 *
 * Validation proves a config is internally consistent; only `tsc` proves the
 * generated code is code. Without this the scaffolder could confidently emit a
 * prop that no longer exists.
 *
 * Usage: npm run typecheck:scaffold -w @bloomskill/table-mcp   (build first)
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REPO_ROOT = join(PKG_ROOT, '../..')
const OUT = join(PKG_ROOT, '.typecheck-scaffold')

const { loadCorpus } = await import(join(PKG_ROOT, 'dist/corpus.js'))
const { scaffoldGrid, SCAFFOLD_FEATURES } = await import(join(PKG_ROOT, 'dist/scaffold.js'))

const corpus = loadCorpus()
const COLUMNS = [
  { id: 'name', editable: true },
  { id: 'age', type: 'number', editable: true },
  { id: 'status', type: 'singleSelect' },
]

/** One case per adapter, plus one per capability, plus everything at once. */
const CASES = [
  ...['mui', 'shadcn', 'engine'].map((adapter) => ({ name: `adapter-${adapter}`, adapter, features: ['sorting', 'pagination'] })),
  ...SCAFFOLD_FEATURES.map((f) => ({ name: `feature-${f}`, adapter: 'mui', features: [f] })),
  { name: 'everything', adapter: 'shadcn', features: [...SCAFFOLD_FEATURES] },
]

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const testCase of CASES) {
  const { code } = scaffoldGrid(corpus, {
    adapter: testCase.adapter,
    features: testCase.features,
    columns: COLUMNS,
  })
  writeFileSync(join(OUT, `${testCase.name}.tsx`), code)
}

// The output dir sits inside packages/mcp, so ordinary node resolution walks up
// to the workspace root's node_modules and finds the symlinked @bloomskill/*
// packages and react types — no path mapping needed.
writeFileSync(
  join(OUT, 'tsconfig.json'),
  JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'bundler',
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        jsx: 'react-jsx',
        strict: true,
        skipLibCheck: true,
        noEmit: true,
        types: [],
      },
      include: ['*.tsx', '*.d.ts'],
    },
    null,
    2,
  ),
)

copyFileSync(join(PKG_ROOT, 'scripts/css-shim.d.ts'), join(OUT, 'css-shim.d.ts'))

console.log(`typechecking ${CASES.length} scaffolded components…`)
try {
  execFileSync(join(REPO_ROOT, 'node_modules/.bin/tsc'), ['-p', join(OUT, 'tsconfig.json')], {
    stdio: 'pipe',
    encoding: 'utf8',
  })
  console.log(`✓ all ${CASES.length} scaffolded components compile against the built packages`)
  rmSync(OUT, { recursive: true, force: true })
} catch (error) {
  console.error(error.stdout || error.message)
  console.error(`\n✗ scaffolded output does not compile. Files kept in ${OUT} for inspection.`)
  process.exit(1)
}
