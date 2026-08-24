import type { VinculumOperations } from '../operations.js'
export function read(sigillum: string, mode: 'text' | 'dom' | 'a11y' | 'screenshot', operations: VinculumOperations): Promise<unknown> { return operations.read(sigillum, mode) }
