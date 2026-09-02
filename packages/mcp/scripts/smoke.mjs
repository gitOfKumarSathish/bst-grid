#!/usr/bin/env node
/**
 * End-to-end smoke test: boots the built server over stdio as a real MCP client
 * would, lists its tools/resources/prompts, and calls every tool once.
 *
 * This is the MCP package's stand-in for CLAUDE.md §13's "wire it into the demo
 * before publishing" gate — an MCP server can't be shown in `apps/demo`, so the
 * equivalent proof is that a real client can connect and every tool answers.
 *
 * Usage: npm run smoke -w @bloomskill/table-mcp   (build first)
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/** Tool calls to exercise: [tool, args, a substring the response must contain]. */
const CALLS = [
  ['bst_search_docs', { query: 'batch editing save in one call' }, 'onSave'],
  // I5 (WebSocket/live merge) is the remaining ❌ — exercises the not-built path.
  ['bst_search_docs', { query: 'websocket live update merge', kind: 'requirement' }, 'NOT BUILT'],
  ['bst_get_feature', { flag: 'enableClipboard' }, 'enableCellSelection'],
  // D1 (virtualization) is implemented now — status-agnostic check on its flag.
  ['bst_get_feature', { requirement: 'D1' }, 'enableVirtualization'],
  ['bst_get_feature', { kind: 'toggle', layer: 'engine' }, 'enableSorting'],
  ['bst_get_cell_type', { type: 'multiSelect' }, 'maxChips'],
  ['bst_get_cell_type', {}, 'sparkline'],
  ['bst_get_api', { symbol: 'useBstTable' }, 'useBstTable'],
  ['bst_get_example', { name: 'quick-start' }, 'BstTable'],
  // A real consumer: examples/ depend on the published engine.
  ['bst_detect_version', { path: join(PKG_ROOT, '../../examples/quick-start') }, '@bloomskill/table-engine'],
  // A project that does not use Bst-Table yet still gets an actionable answer.
  ['bst_detect_version', { path: PKG_ROOT }, 'npm install @bloomskill/table-engine'],
  ['bst_validate_config', { code: "<BstTableMui data={rows} columns={cols} showSearch enableGlobalFilter={false} />" }, 'showSearch'],
  ['bst_scaffold_grid', { adapter: 'mui', features: ['editing', 'clipboard'], columns: [{ id: 'name', type: 'text' }] }, 'BstTableMui'],
  ['bst_list_versions', {}, 'released versions'],
]

let failures = 0
const fail = (msg) => {
  failures++
  console.error(`  ✗ ${msg}`)
}

const client = new Client({ name: 'bst-table-mcp-smoke', version: '1.0.0' })
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(PKG_ROOT, 'dist/cli.js')],
  stderr: 'pipe',
})

await client.connect(transport)
console.log('connected to bst-table-mcp-server\n')

const { tools } = await client.listTools()
console.log(`tools/list → ${tools.length}`)
for (const tool of tools) {
  const missing = [!tool.description && 'description', !tool.annotations && 'annotations'].filter(Boolean)
  if (missing.length) fail(`${tool.name} is missing: ${missing.join(', ')}`)
  else console.log(`  ✓ ${tool.name}`)
}

const { resources } = await client.listResources().catch(() => ({ resources: [] }))
const { resourceTemplates = [] } = await client.listResourceTemplates().catch(() => ({ resourceTemplates: [] }))
console.log(`\nresources/list → ${resources.length} static + ${resourceTemplates.length} templated`)
for (const r of [...resources, ...resourceTemplates]) console.log(`  ✓ ${r.uri ?? r.uriTemplate}`)

// Read the agent prompt over the wire — it is the one resource a human copies by
// hand, so a broken render should fail here rather than on someone's clipboard.
try {
  const read = await client.readResource({ uri: 'bst://prompt' })
  const text = (read.contents ?? []).map((c) => c.text ?? '').join('\n')
  if (!text.includes('# Bst-Table — agent prompt')) fail('bst://prompt did not render the briefing')
  else if (!/enableClipboard/.test(text)) fail('bst://prompt is missing the flag listing')
  else console.log(`  ✓ read bst://prompt (${Math.round(text.length / 1024)} KB)`)
} catch (error) {
  fail(`bst://prompt threw: ${error.message}`)
}

const { prompts } = await client.listPrompts().catch(() => ({ prompts: [] }))
console.log(`\nprompts/list → ${prompts.length}`)
for (const p of prompts) console.log(`  ✓ ${p.name}`)

console.log(`\ntools/call → ${CALLS.length}`)
for (const [name, args, expected] of CALLS) {
  const label = `${name}(${JSON.stringify(args).slice(0, 60)})`
  try {
    const result = await client.callTool({ name, arguments: args })
    const text = (result.content ?? []).map((c) => c.text ?? '').join('\n')
    if (result.isError) fail(`${label} returned isError: ${text.slice(0, 160)}`)
    else if (!text.includes(expected)) fail(`${label} did not contain "${expected}". Got: ${text.slice(0, 200)}`)
    else console.log(`  ✓ ${label}`)
  } catch (error) {
    fail(`${label} threw: ${error.message}`)
  }
}

// Every tool must be exercised, or the smoke test drifts behind the server.
const called = new Set(CALLS.map(([name]) => name))
for (const tool of tools) {
  if (!called.has(tool.name)) fail(`${tool.name} is registered but never exercised by this smoke test`)
}

await client.close()

console.log(failures ? `\n${failures} failure(s)` : `\nall good — ${tools.length} tools, ${CALLS.length} calls`)
process.exit(failures ? 1 : 0)
