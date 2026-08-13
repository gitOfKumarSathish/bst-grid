import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type { BstCorpus } from '../types.js'
import { registerApiTool } from './api.js'
import { registerCellTypeTool } from './cells.js'
import { registerExampleTool } from './examples.js'
import { registerFeatureTool } from './features.js'
import { registerScaffoldTool } from './scaffold.js'
import { registerSearchTool } from './search.js'
import { registerValidateTool } from './validate.js'
import { registerVersionTool } from './version.js'

/**
 * Registers every Bst-Table tool. Names carry the `bst_` prefix so they stay
 * unambiguous alongside other MCP servers in the same client.
 */
export function registerTools(server: McpServer, corpus: BstCorpus): void {
  registerSearchTool(server, corpus)
  registerFeatureTool(server, corpus)
  registerCellTypeTool(server, corpus)
  registerApiTool(server, corpus)
  registerExampleTool(server, corpus)
  registerValidateTool(server, corpus)
  registerScaffoldTool(server, corpus)
  registerVersionTool(server, corpus)
}
