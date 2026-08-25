import type { VinculumOperations } from '../operations.js'

export interface SearchRequest { sigillum: string; query: string; engine?: 'google'; depth?: number; maxPages?: number }

/** @implements SPEC-ORBIS-P6-EXPLORATIO One MCP tool entry point; traversal remains in the operations boundary. */
export function search(request: SearchRequest, operations: VinculumOperations): Promise<unknown> {
  return operations.search(request)
}
