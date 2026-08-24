import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P0-IPC */
export function registerReadyHandler(
  resolveWindow: ResolveWindow,
  publishState: (window: BrowserWindow) => void
): () => void {
  const listener = (event: IpcMainEvent): void => {
    const window = resolveWindow(event.sender.id)
    if (window) publishState(window)
  }
  ipcMain.on(channels.ready, listener)
  return () => ipcMain.removeListener(channels.ready, listener)
}
