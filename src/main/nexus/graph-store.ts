import type { GraphEdgeView, GraphNodeView, GraphViewState } from '../../shared/ipc-contract.js'

export interface GraphSnapshot { nodes: GraphNodeView[]; edges: GraphEdgeView[] }

/** @implements SPEC-ORBIS-P1-NEXUS */
export class GraphStore {
  private readonly graphs = new Map<string, GraphSnapshot>()
  private readonly listeners = new Map<string, Set<() => void>>()
  restore(curaId: string, snapshot: GraphSnapshot): void { this.graphs.set(curaId, snapshot) }
  snapshot(curaId: string, activePageId: string | null): GraphViewState { const graph = this.graphs.get(curaId) ?? { nodes: [], edges: [] }; return { ...graph, activePageId } }
  addNode(curaId: string, node: GraphNodeView): void { const graph = this.graphs.get(curaId) ?? { nodes: [], edges: [] }; const index = graph.nodes.findIndex((item) => item.id === node.id); const nodes = index < 0 ? [...graph.nodes, node] : graph.nodes.map((item) => item.id === node.id ? node : item); this.graphs.set(curaId, { ...graph, nodes }); this.emit(curaId) }
  addEdge(curaId: string, edge: GraphEdgeView): void { const graph = this.graphs.get(curaId) ?? { nodes: [], edges: [] }; const found = graph.edges.find((item) => item.from === edge.from && item.to === edge.to && item.kind === edge.kind); const edges = found ? graph.edges.map((item) => item === found ? { ...item, count: item.count + 1, lastAt: edge.lastAt } : item) : [...graph.edges, edge]; this.graphs.set(curaId, { ...graph, edges }); this.emit(curaId) }
  subscribe(curaId: string, listener: () => void): () => void { const listeners = this.listeners.get(curaId) ?? new Set<() => void>(); listeners.add(listener); this.listeners.set(curaId, listeners); return () => listeners.delete(listener) }
  private emit(curaId: string): void { this.listeners.get(curaId)?.forEach((listener) => listener()) }
}
