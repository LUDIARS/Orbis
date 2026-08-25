import type { VinculumOperations } from '../operations.js'

/** @implements SPEC-ORBIS-P6-MEMORIA Return a Cc-forwardable payload; Orbis never invokes Memoria itself. */
export function toMemoria(sigillum: string, kind: 'note' | 'task', selection: string | undefined, summary: string | undefined, operations: VinculumOperations): Promise<unknown> {
  return operations.toMemoria(sigillum, kind, selection, summary)
}
