import type { VinculumOperations } from '../operations.js'
export function navigate(sigillum: string, url: string, operations: VinculumOperations): Promise<unknown> { return operations.navigate(sigillum, url) }
