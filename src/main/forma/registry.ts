import type { HabitusId } from '../habitus/types.js'

/** @implements SPEC-ORBIS-P2-FORMA */
export interface Forma { id: string; match: (url: URL) => boolean; css?: string; preloadScript?: string; habitus?: HabitusId[]; disallowAutomation?: boolean }

/** @implements SPEC-ORBIS-P2-FORMA */
export class FormaRegistry {
  constructor(private readonly formas: readonly Forma[]) {}
  matching(url: string, habitus: HabitusId): Forma[] {
    try { const parsed = new URL(url); return this.formas.filter((forma) => (!forma.habitus || forma.habitus.includes(habitus)) && forma.match(parsed)) } catch { return [] }
  }

  /** @implements SPEC-ORBIS-P6-EXPLORATIO Enforce site-declared automation policy before opening or redirecting exploration pages. */
  allowsAutomation(url: string, habitus: HabitusId): boolean {
    return this.matching(url, habitus).every((forma) => forma.disallowAutomation !== true)
  }
}
