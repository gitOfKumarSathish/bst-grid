#!/usr/bin/env node
/**
 * Bst-Table MCP server — stdio entry point.
 *
 * Register with an MCP client as:  npx -y @bloomskill/table-mcp
 *
 * stdio transport: the protocol owns stdout, so all logging goes to stderr.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { SERVER_NAME } from './constants.js'
import { loadCorpus } from './corpus.js'
import { createServer } from './server.js'

async function main(): Promise<void> {
  const corpus = loadCorpus()
  const server = createServer(corpus)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`${SERVER_NAME} v${corpus.version} ready (stdio)`)
}

main().catch((error: unknown) => {
  console.error(`Bst-Table MCP server failed to start: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
