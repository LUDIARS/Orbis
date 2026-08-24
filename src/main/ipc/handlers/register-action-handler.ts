import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { isActionId } from '../../actions/registry.js'
import type { ActionId } from '../../actions/types.js'
import { channels } from '../channels.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P0-IPC */
export function registerActionHandler(
  resolveWindow: ResolveWindow,
  execute: (id: ActionId, window: BrowserWindow) => void
): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (!window || typeof value !== 'string' || !isActionId(value)) return
    execute(value, window)
  }
  ipcMain.on(channels.action, listener)
  return () => ipcMain.removeListener(channels.action, listener)
}
