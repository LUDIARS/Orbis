import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'

/** @implements SPEC-ORBIS-P1-IPC */
export function registerSearchHandler(resolveWindow: (senderId: number) => BrowserWindow | undefined, search: (window: BrowserWindow, query: string) => string[]): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (!window || typeof value !== 'string' || value.length > 256) return
    event.sender.send(channels.searchResult, { pageIds: search(window, value) })
  }
  ipcMain.on(channels.search, listener)
  return () => ipcMain.removeListener(channels.search, listener)
}
