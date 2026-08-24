import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P0-IPC */
export function registerSelectPageHandler(
  resolveWindow: ResolveWindow,
  selectPage: (window: BrowserWindow, pageId: string) => void
): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (!window || typeof value !== 'string' || value.length > 128) return
    selectPage(window, value)
  }
  ipcMain.on(channels.selectPage, listener)
  return () => ipcMain.removeListener(channels.selectPage, listener)
}
