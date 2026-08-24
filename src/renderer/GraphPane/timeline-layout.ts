import type { GraphNodeView } from '../../shared/ipc-contract'

export interface TimelinePosition {
  id: string
  x: number
  y: number
}

/** @implements SPEC-ORBIS-P1-GRAPHPANE */
export function timelineNodePositions(nodes: readonly GraphNodeView[]): TimelinePosition[] {
  return [...nodes]
    .sort((left, right) => left.lastVisit.localeCompare(right.lastVisit) || left.id.localeCompare(right.id))
    .map((node, index) => ({ id: node.id, x: 60 + index * 150, y: 120 }))
}
