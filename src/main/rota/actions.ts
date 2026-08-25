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
  create(cura: Cura, restore?: Page[]): void
  activateCura(curaId: string): BrowserWindow | undefined
  selectPageById(pageId: string): BrowserWindow | undefined
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
function focusRotaCura(window: BrowserWindow | undefined): BrowserWindow | undefined {
  if (!window) return undefined
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
  factory.create(cura, pageRepository.listByCura(cura.id))
  return focusRotaCura(factory.activateCura(cura.id))
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

  factory.create(cura, pages)
  return focusRotaCura(factory.selectPageById(pageId))
}
