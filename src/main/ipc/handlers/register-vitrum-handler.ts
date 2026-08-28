import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { channels, type VitrumSpecView, type VitrumViewState } from '../../../shared/ipc-contract.js'

/** @implements SPEC-ORBIS-VITRUM-ACTION Exposes only typed specs; Vitrum validates all data again in main. */
export function registerVitrumHandler(
  resolveWindow: (senderId: number) => BrowserWindow | undefined,
  get: (window: BrowserWindow) => VitrumViewState,
  set: (window: BrowserWindow, spec: VitrumSpecView) => VitrumViewState
): () => void {
  const getListener = (event: IpcMainInvokeEvent): VitrumViewState => {
    const window = resolveWindow(event.sender.id)
    if (!window) throw new Error('Vitrum is only available to the Orbis UI.')
    return get(window)
  }
  const setListener = (event: IpcMainInvokeEvent, spec: unknown): VitrumViewState => {
    const window = resolveWindow(event.sender.id)
    if (!window) throw new Error('Vitrum is only available to the Orbis UI.')
    return set(window, spec as VitrumSpecView)
  }
  ipcMain.handle(channels.vitrum, getListener)
  ipcMain.handle(channels.vitrumSet, setListener)
  return () => { ipcMain.removeHandler(channels.vitrum); ipcMain.removeHandler(channels.vitrumSet) }
}
