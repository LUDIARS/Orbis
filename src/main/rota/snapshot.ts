import type { RotaCuraView, RotaSnapshot } from '../../shared/ipc-contract.js'
import type { CuraRepository } from '../tabularium/repositories/cura-repo.js'
import type { Page, PageRepository } from '../tabularium/repositories/page-repo.js'
import type { GraphStore } from '../nexus/graph-store.js'

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export function sortRotaPages(pages: readonly Page[]): Page[] {
  return [...pages].sort((left, right) => right.lastVisit.localeCompare(left.lastVisit))
}

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export function buildRotaCura(
  cura: { id: string; title: string; color: string },
  pages: readonly Page[],
  nodeCount: number
): RotaCuraView {
  return {
    id: cura.id,
    title: cura.title,
    color: cura.color,
    nodeCount,
    pages: sortRotaPages(pages).map((page) => ({
      id: page.id,
      title: page.title,
      url: page.url,
      lastVisit: page.lastVisit
    }))
  }
}

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export function buildRotaSnapshot(
  curaRepository: CuraRepository,
  pageRepository: PageRepository,
  graphStore: GraphStore
): RotaSnapshot {
  return {
    curas: curaRepository.list().map((cura) => {
      const nodeCount = graphStore.snapshot(cura.id, null).nodes.length
      return buildRotaCura(cura, pageRepository.listByCura(cura.id), nodeCount)
    })
  }
}
