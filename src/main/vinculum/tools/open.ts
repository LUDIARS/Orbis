import type { VinculumOperations } from '../operations.js'
export function open(sigillum: string, url: string, visible: boolean, operations: VinculumOperations): Promise<unknown> { return operations.open(sigillum, url, visible) }
