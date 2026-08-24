import type { VinculumOperations } from '../operations.js'
export function act(sigillum: string, action: Record<string, unknown>, operations: VinculumOperations): Promise<unknown> { return operations.act(sigillum, action) }
