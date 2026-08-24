import type { RotaSnapshot } from '../../shared/ipc-contract.js'
import type { PageRepository } from '../tabularium/repositories/page-repo.js'

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export function filterRotaSnapshot(
  repository: PageRepository,
  snapshot: RotaSnapshot,
  query: string
): RotaSnapshot {
  if (!query.trim()) return snapshot
  return {
    curas: snapshot.curas.map((cura) => {
      const matches = new Set(repository.search(cura.id, query))
      return { ...cura, pages: cura.pages.filter((page) => matches.has(page.id)) }
    }).filter((cura) => cura.pages.length > 0)
  }
}
