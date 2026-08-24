import type { HabitusId } from '../habitus/types.js'

/** @implements SPEC-ORBIS-P2-FORMA */
export interface Forma { id: string; match: (url: URL) => boolean; css?: string; preloadScript?: string; habitus?: HabitusId[] }

/** @implements SPEC-ORBIS-P2-FORMA */
export class FormaRegistry {
  constructor(private readonly formas: readonly Forma[]) {}
  matching(url: string, habitus: HabitusId): Forma[] {
    try { const parsed = new URL(url); return this.formas.filter((forma) => (!forma.habitus || forma.habitus.includes(habitus)) && forma.match(parsed)) } catch { return [] }
  }
}
