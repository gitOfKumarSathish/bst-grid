#!/usr/bin/env node
/**
 * Bst-Table MCP server — stdio entry point.
 *
 * Register with an MCP client as:  npx -y @bloomskill/table-mcp
 *
 * One subcommand, for clients that do not speak MCP at all:
 *   npx -y @bloomskill/table-mcp prompt   → the agent prompt on stdout
 *
 * stdio transport: the protocol owns stdout, so all logging goes to stderr.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { buildAgentPrompt } from './agent-prompt.js'
import { SERVER_NAME } from './constants.js'
import { loadCorpus } from './corpus.js'
import { createServer } from './server.js'

async function main(): Promise<void> {
  const corpus = loadCorpus()

  // `prompt` prints and exits — pipe it into a clipboard or a file:
  //   npx -y @bloomskill/table-mcp prompt | pbcopy
  // This is the ONLY path that writes to stdout without the MCP transport, and
  // it never connects one, so it cannot corrupt a protocol stream.
  if (process.argv[2] === 'prompt') {
    process.stdout.write(buildAgentPrompt(corpus))
    return
  }

  const server = createServer(corpus)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error(`${SERVER_NAME} v${corpus.version} ready (stdio)`)
}

main().catch((error: unknown) => {
  console.error(`Bst-Table MCP server failed to start: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
