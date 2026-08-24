import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P0-IPC */
export function registerNavigateHandler(
  resolveWindow: ResolveWindow,
  navigate: (window: BrowserWindow, url: string) => void
): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (!window || typeof value !== 'string') return
    navigate(window, value)
  }
  ipcMain.on(channels.navigate, listener)
  return () => ipcMain.removeListener(channels.navigate, listener)
}
