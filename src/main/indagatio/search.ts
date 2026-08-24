import type { PageRepository } from '../tabularium/repositories/page-repo.js'

/** @implements SPEC-ORBIS-P1-INDAGATIO */
export function searchPages(repository: PageRepository, curaId: string, query: string): string[] {
  return repository.search(curaId, query)
}
