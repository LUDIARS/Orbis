import type { BrowserWindow } from 'electron'
import type { ActionId } from '../../shared/action-id.js'
import type { HabitusId } from '../habitus/types.js'

export type { ActionId } from '../../shared/action-id.js'

/** Action が触れる Cura 操作面。 実装は cura/window-factory が持つ。 */
export interface CuraController {
  goBack(window: BrowserWindow): void
  goForward(window: BrowserWindow): void
  reload(window: BrowserWindow): void
  newPage(window: BrowserWindow): void
  closePage(window: BrowserWindow): void
  newCura(): void
  toggleAlwaysOnTop(window: BrowserWindow): void
  cycleOpacity(window: BrowserWindow): void
  minimizeOthers(): void
  focusSearch(window: BrowserWindow): void
  toggleGraphLayout(window: BrowserWindow): void
  setHabitus(window: BrowserWindow, id: HabitusId): void
  toggleComparatio(window: BrowserWindow): void
  cycleHabitus(window: BrowserWindow): void
}

export interface ActionContext {
  window: BrowserWindow
  cura: CuraController
}

export type Action = (context: ActionContext) => void | Promise<void>
