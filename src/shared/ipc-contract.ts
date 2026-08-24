import type { ActionId } from './action-id.js'

/** @implements SPEC-ORBIS-P0-IPC */
export const channels = {
  navigate: 'orbis:navigate',
  action: 'orbis:action',
  selectPage: 'orbis:select-page',
  ready: 'orbis:ready',
  pages: 'orbis:pages',
  navigationError: 'orbis:navigation-error',
  fenestraState: 'orbis:fenestra-state'
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

export interface RendererEventMap {
  [channels.pages]: PagesViewState
  [channels.navigationError]: string
  [channels.fenestraState]: FenestraViewState
}

export type RendererEventName = keyof RendererEventMap

export interface OrbisBridge {
  navigate(url: string): void
  action(id: ActionId): void
  selectPage(id: string): void
  ready(): void
  on<K extends RendererEventName>(channel: K, listener: (value: RendererEventMap[K]) => void): () => void
}
