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
  graphPane: 'orbis:graph-pane',
  focusSearch: 'orbis:focus-search',
  toggleGraphLayout: 'orbis:toggle-graph-layout',
  habitusState: 'orbis:habitus-state',
  productFacts: 'orbis:product-facts',
  comparatio: 'orbis:comparatio',
  comparatioToggle: 'orbis:comparatio-toggle',
  gesture: 'orbis:gesture',
  gestureOverlay: 'orbis:gesture-overlay',
  bindings: 'orbis:bindings',
  bindingSave: 'orbis:binding-save',
  bindingReset: 'orbis:binding-reset',
  settingsPane: 'orbis:settings-pane',
  rotaSnapshot: 'orbis:rota-snapshot',
  rotaSelectCura: 'orbis:rota-select-cura',
  rotaSelectPage: 'orbis:rota-select-page',
  rotaSearch: 'orbis:rota-search',
  rotaClose: 'orbis:rota-close',
  rotaReady: 'orbis:rota-ready',
  sigillum: 'orbis:sigillum'
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
export interface GraphNodeView { id: string; url: string; title: string; lastVisit: string; umbra?: boolean }
export interface GraphEdgeView { from: string; to: string; kind: 'navigate' | 'newview' | 'llm'; count: number; lastAt: string }
/** @implements SPEC-ORBIS-P5-SIGILLUM */
export interface SigillumViewState { browser: string | null; page: string | null }
export interface GraphViewState { nodes: GraphNodeView[]; edges: GraphEdgeView[]; activePageId: string | null }
export interface SearchResult { pageIds: string[] }
export type GraphLayout = 'force' | 'timeline'
/** @implements SPEC-ORBIS-P2-COMPARATIO */
export const curaLayout = {
  toolbarHeight: 88,
  comparatioToggleHeight: 42,
  comparatioPanelHeight: 180
} as const
export type HabitusId = 'desktop' | 'mobile' | 'shopping'
export interface HabitusViewState { id: HabitusId }
export interface ProductFactsView { id: string; title: string; price: string | null; rating: string | null; reviewCount: string | null; delivery: string | null; url: string }
export interface ComparatioViewState { open: boolean; products: ProductFactsView[] }
export interface GesturePoint { x: number; y: number; at: number }
export interface GestureOverlayState { points: GesturePoint[]; stroke: string | null; actionName: string | null; active: boolean }
export type BindingScope = 'key' | 'gesture'
export interface BindingView { id: string; actionId: ActionId; accelerator: string; scope: BindingScope }

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export interface RotaPageView {
  id: string
  title: string
  url: string
  lastVisit: string
}

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export interface RotaCuraView {
  id: string
  title: string
  color: string
  nodeCount: number
  pages: RotaPageView[]
}

/** @implements SPEC-ORBIS-P4-SNAPSHOT */
export interface RotaSnapshot {
  curas: RotaCuraView[]
}

export interface RendererEventMap {
  [channels.pages]: PagesViewState
  [channels.navigationError]: string
  [channels.fenestraState]: FenestraViewState
  [channels.graph]: GraphViewState
  [channels.searchResult]: SearchResult
  [channels.focusSearch]: undefined
  [channels.toggleGraphLayout]: undefined
  [channels.habitusState]: HabitusViewState
  [channels.comparatio]: ComparatioViewState
  [channels.gestureOverlay]: GestureOverlayState
  [channels.rotaSnapshot]: RotaSnapshot
}

export type RendererEventName = keyof RendererEventMap

export interface OrbisBridge {
  navigate(url: string): void
  action(id: ActionId): void
  selectPage(id: string): void
  search(query: string): void
  setGraphLayout(layout: GraphLayout): void
  setGraphPaneCollapsed(collapsed: boolean): void
  setHabitus(id: HabitusId): void
  toggleComparatio(): void
  gesture(points: GesturePoint[], complete: boolean): void
  bindings(scope: BindingScope): Promise<BindingView[]>
  saveBinding(binding: BindingView): Promise<void>
  resetBindings(scope: BindingScope): Promise<void>
  setSettingsPaneOpen(open: boolean): void
  rotaSelectCura(curaId: string): void
  rotaSelectPage(curaId: string, pageId: string): void
  rotaSearch(query: string): void
  rotaClose(): void
  rotaReady(): void
  sigillum(): Promise<SigillumViewState>
  ready(): void
  on<K extends RendererEventName>(channel: K, listener: (value: RendererEventMap[K]) => void): () => void
}
