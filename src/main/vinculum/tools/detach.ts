import type { SigillumService } from '../../sigillum/service.js'
export function detach(sigillum: string, seals: SigillumService): { detached: boolean } { seals.detach(sigillum); return { detached: true } }
