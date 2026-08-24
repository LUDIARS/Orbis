import { ipcMain, type IpcMainEvent } from 'electron'
import { channels } from '../../../shared/ipc-contract.js'

const MAX_IDENTIFIER_LENGTH = 128
const MAX_QUERY_LENGTH = 256

/** @implements SPEC-ORBIS-P4-OVERLAY */
const isIdentifier = (value: unknown): value is string => (
  typeof value === 'string' && value.length > 0 && value.length <= MAX_IDENTIFIER_LENGTH
)

export interface RotaHandlers {
  isOverlay(senderId: number): boolean
  selectCura(curaId: string): void
  selectPage(curaId: string, pageId: string): void
  search(query: string): void
  close(): void
  ready(): void
}

/** @implements SPEC-ORBIS-P4-OVERLAY */
export function registerRotaHandler(handlers: RotaHandlers): () => void {
  const authorized = (event: IpcMainEvent): boolean => handlers.isOverlay(event.sender.id)
  const selectCura = (event: IpcMainEvent, curaId: unknown): void => {
    if (authorized(event) && isIdentifier(curaId)) handlers.selectCura(curaId)
  }
  const selectPage = (event: IpcMainEvent, curaId: unknown, pageId: unknown): void => {
    if (authorized(event) && isIdentifier(curaId) && isIdentifier(pageId)) handlers.selectPage(curaId, pageId)
  }
  const search = (event: IpcMainEvent, query: unknown): void => {
    if (authorized(event) && typeof query === 'string' && query.length <= MAX_QUERY_LENGTH) handlers.search(query)
  }
  const close = (event: IpcMainEvent): void => {
    if (authorized(event)) handlers.close()
  }
  const ready = (event: IpcMainEvent): void => {
    if (authorized(event)) handlers.ready()
  }
  ipcMain.on(channels.rotaSelectCura, selectCura)
  ipcMain.on(channels.rotaSelectPage, selectPage)
  ipcMain.on(channels.rotaSearch, search)
  ipcMain.on(channels.rotaClose, close)
  ipcMain.on(channels.rotaReady, ready)
  return () => {
    ipcMain.removeListener(channels.rotaSelectCura, selectCura)
    ipcMain.removeListener(channels.rotaSelectPage, selectPage)
    ipcMain.removeListener(channels.rotaSearch, search)
    ipcMain.removeListener(channels.rotaClose, close)
    ipcMain.removeListener(channels.rotaReady, ready)
  }
}
