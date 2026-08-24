import { ipcMain, type IpcMainEvent } from 'electron'

/** @implements SPEC-ORBIS-P1-IPC */
export function registerPageContentHandler(save: (senderId: number, content: string) => void): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => { if (typeof value === 'string' && value.length <= 2048) save(event.sender.id, value) }
  ipcMain.on('orbis:page-content', listener)
  return () => ipcMain.removeListener('orbis:page-content', listener)
}
