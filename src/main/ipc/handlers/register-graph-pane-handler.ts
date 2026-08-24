import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels, type GraphLayout } from '../../../shared/ipc-contract.js'

/** @implements SPEC-ORBIS-P1-IPC */
export function registerGraphPaneHandler(resolveWindow: (senderId: number) => BrowserWindow | undefined, update: (window: BrowserWindow, collapsed: boolean, layout?: GraphLayout) => void): () => void {
  const paneListener = (event: IpcMainEvent, value: unknown): void => { const window = resolveWindow(event.sender.id); if (window && typeof value === 'boolean') update(window, value) }
  const layoutListener = (event: IpcMainEvent, value: unknown): void => { const window = resolveWindow(event.sender.id); if (window && (value === 'force' || value === 'timeline')) update(window, false, value) }
  ipcMain.on(channels.graphPane, paneListener); ipcMain.on(channels.graphLayout, layoutListener)
  return () => { ipcMain.removeListener(channels.graphPane, paneListener); ipcMain.removeListener(channels.graphLayout, layoutListener) }
}
