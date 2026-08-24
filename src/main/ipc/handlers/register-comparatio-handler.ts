import { ipcMain, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'

/** @implements SPEC-ORBIS-P2-COMPARATIO */
export function registerComparatioHandler(toggle: (senderId: number) => void): () => void {
  const listener = (event: IpcMainEvent): void => toggle(event.sender.id)
  ipcMain.on(channels.comparatioToggle, listener)
  return () => ipcMain.removeListener(channels.comparatioToggle, listener)
}
