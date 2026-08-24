import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../../../shared/ipc-contract.js'

/** @implements SPEC-ORBIS-P3-SETTINGS */
export function registerSettingsPaneHandler(
  resolveWindow: (senderId: number) => BrowserWindow | undefined,
  update: (window: BrowserWindow, open: boolean) => void
): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (window && typeof value === 'boolean') update(window, value)
  }
  ipcMain.on(channels.settingsPane, listener)
  return () => ipcMain.removeListener(channels.settingsPane, listener)
}
