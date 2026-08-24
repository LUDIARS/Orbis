import type { NavigationKind } from '../tabularium/repositories/page-repo.js'

/** @implements SPEC-ORBIS-P1-NEXUS */
export function resolveNavigationParent(hasCommittedNavigation: boolean, currentPageId: string, initialPageId: string | null): string | null { return hasCommittedNavigation ? currentPageId : initialPageId }
/** @implements SPEC-ORBIS-P1-NEXUS */
export function navigationKindForNewView(): NavigationKind { return 'newview' }
