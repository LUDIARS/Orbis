import type { BrowserWindow } from 'electron'
import type { Cura } from '../tabularium/repositories/cura-repo.js'
import type { Page } from '../tabularium/repositories/page-repo.js'

export interface RotaCuraResolver {
  list(): Cura[]
}

export interface RotaPageResolver {
  listByCura(curaId: string): Page[]
}

export interface RotaCuraWindowFactory {
  create(cura: Cura, restore?: Page[]): BrowserWindow
  selectPage(window: BrowserWindow, pageId: string): void
  windowForCura(curaId: string): BrowserWindow | undefined
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
function focusRotaCura(window: BrowserWindow): BrowserWindow {
  if (window.isMinimized()) window.restore()
  window.show()
  window.focus()
  return window
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
export function selectRotaCura(
  curaId: string,
  curaRepository: RotaCuraResolver,
  pageRepository: RotaPageResolver,
  factory: RotaCuraWindowFactory
): BrowserWindow | undefined {
  const cura = curaRepository.list().find((candidate) => candidate.id === curaId)
  if (!cura) return undefined
  const window = factory.windowForCura(cura.id) ?? factory.create(cura, pageRepository.listByCura(cura.id))
  return focusRotaCura(window)
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
export function selectRotaPage(
  curaId: string,
  pageId: string,
  curaRepository: RotaCuraResolver,
  pageRepository: RotaPageResolver,
  factory: RotaCuraWindowFactory
): BrowserWindow | undefined {
  const cura = curaRepository.list().find((candidate) => candidate.id === curaId)
  if (!cura) return undefined
  const pages = pageRepository.listByCura(cura.id)
  if (!pages.some((page) => page.id === pageId)) return undefined

  const existingWindow = factory.windowForCura(cura.id)
  if (existingWindow) {
    factory.selectPage(existingWindow, pageId)
    return focusRotaCura(existingWindow)
  }

  const window = factory.create(cura, pages)
  window.webContents.once('did-finish-load', () => {
    if (!window.isDestroyed()) factory.selectPage(window, pageId)
  })
  return focusRotaCura(window)
}
