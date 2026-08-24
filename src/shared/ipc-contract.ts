import type { ActionId } from './action-id.js'

/** @implements SPEC-ORBIS-P0-IPC */
export const channels = {
  navigate: 'orbis:navigate',
  action: 'orbis:action',
  selectPage: 'orbis:select-page',
  ready: 'orbis:ready',
  pages: 'orbis:pages',
  navigationError: 'orbis:navigation-error',
  fenestraState: 'orbis:fenestra-state',
  graph: 'orbis:graph',
  search: 'orbis:search',
  searchResult: 'orbis:search-result',
  graphLayout: 'orbis:graph-layout',
  graphPane: 'orbis:graph-pane'
  , focusSearch: 'orbis:focus-search'
  , toggleGraphLayout: 'orbis:toggle-graph-layout'
} as const

export interface PageViewState {
  id: string
  title: string
  url: string
}

export interface PagesViewState {
  pages: PageViewState[]
  activePageId: string | null
}

export interface FenestraViewState {
  alwaysOnTop: boolean
  opacity: number
}
export interface GraphNodeView { id: string; url: string; title: string; lastVisit: string }
export interface GraphEdgeView { from: string; to: string; kind: 'navigate' | 'newview'; count: number; lastAt: string }
export interface GraphViewState { nodes: GraphNodeView[]; edges: GraphEdgeView[]; activePageId: string | null }
export interface SearchResult { pageIds: string[] }
export type GraphLayout = 'force' | 'timeline'

export interface RendererEventMap {
  [channels.pages]: PagesViewState
  [channels.navigationError]: string
  [channels.fenestraState]: FenestraViewState
  [channels.graph]: GraphViewState
  [channels.searchResult]: SearchResult
  [channels.focusSearch]: undefined
  [channels.toggleGraphLayout]: undefined
}

export type RendererEventName = keyof RendererEventMap

export interface OrbisBridge {
  navigate(url: string): void
  action(id: ActionId): void
  selectPage(id: string): void
  search(query: string): void
  setGraphLayout(layout: GraphLayout): void
  setGraphPaneCollapsed(collapsed: boolean): void
  ready(): void
  on<K extends RendererEventName>(channel: K, listener: (value: RendererEventMap[K]) => void): () => void
}
