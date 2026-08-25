import type { VinculumOperations } from '../operations.js'

/** @implements SPEC-ORBIS-P6-REVEAL User utterance identity is mandatory to prevent autonomous visualization. */
export function reveal(sigillum: string, userUtteranceId: string, operations: VinculumOperations): Promise<unknown> {
  return operations.reveal(sigillum, userUtteranceId)
}
