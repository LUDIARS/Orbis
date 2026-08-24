import type { SigillumService } from '../../sigillum/service.js'
export function attach(sigillum: string, clientId: string, seals: SigillumService): { attached: boolean } {
  if (!seals.attach(sigillum, clientId)) throw new Error('Unknown sigillum.')
  return { attached: true }
}
