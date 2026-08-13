import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { SERVER_NAME } from './constants.js'
import { loadCorpus } from './corpus.js'
import { registerPrompts } from './prompts.js'
import { registerResources } from './resources.js'
import { registerTools } from './tools/index.js'
import type { BstCorpus } from './types.js'

/**
 * Builds the Bst-Table MCP server. The corpus is loaded once and passed to every
 * tool, so a tool never touches the filesystem.
 *
 * @param corpus Injected in tests; defaults to the generated `dist/corpus.json`.
 */
export function createServer(corpus: BstCorpus = loadCorpus()): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: corpus.version,
  })

  registerTools(server, corpus)
  registerResources(server, corpus)
  registerPrompts(server, corpus)

  return server
}

export { loadCorpus }
export type { BstCorpus }
