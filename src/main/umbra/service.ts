/** @implements SPEC-ORBIS-P5-UMBRA */
export const UMBRA_PAGE_CAP = 20

export interface UmbraCandidate {
  pageId: string
  lastVisit: string
}

/** 上限超過分を古い順に返す。Nexus のノードは呼び出し側が残す。 */
export function selectUmbraEvictions(candidates: UmbraCandidate[], cap = UMBRA_PAGE_CAP): string[] {
  if (candidates.length <= cap) return []
  return [...candidates]
    .sort((left, right) => left.lastVisit.localeCompare(right.lastVisit))
    .slice(0, candidates.length - cap)
    .map((candidate) => candidate.pageId)
}
