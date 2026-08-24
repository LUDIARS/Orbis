import { ipcMain, type BrowserWindow, type IpcMainInvokeEvent } from 'electron'
import { channels, type SigillumViewState } from '../../../shared/ipc-contract.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P5-SIGILLUM アドレスバーのスタンプアイコンへ現在の sigillum を渡す。 */
export function registerSigillumHandler(
  resolveWindow: ResolveWindow,
  resolveSigillum: (window: BrowserWindow) => SigillumViewState
): () => void {
  const listener = (event: IpcMainInvokeEvent): SigillumViewState => {
    const window = resolveWindow(event.sender.id)
    if (!window) throw new Error('Sigillum is only available to the Orbis UI.')
    return resolveSigillum(window)
  }
  ipcMain.handle(channels.sigillum, listener)
  return () => ipcMain.removeHandler(channels.sigillum)
}
