import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'
import { isNavigationMode, type NavigationMode } from '../../../shared/navigation-intent.js'

type ResolveWindow = (senderId: number) => BrowserWindow | undefined

/** @implements SPEC-ORBIS-P0-IPC SPEC-ORBIS-P7-START-SCREEN */
export function registerNavigateHandler(
  resolveWindow: ResolveWindow,
  navigate: (window: BrowserWindow, input: string, mode: NavigationMode) => void
): () => void {
  /** @implements SPEC-ORBIS-P0-IPC SPEC-ORBIS-P7-START-SCREEN Validate the renderer payload before dispatch. */
  const listener = (event: IpcMainEvent, payload: unknown): void => {
    const window = resolveWindow(event.sender.id)
    if (!window) return
    // 旧形式 (文字列だけ) も受ける — preload と main の更新順に依存させない。
    if (typeof payload === 'string') {
      navigate(window, payload, 'auto')
      return
    }
    if (typeof payload !== 'object' || payload === null) return
    const { input, mode } = payload as { input?: unknown; mode?: unknown }
    if (typeof input !== 'string') return
    navigate(window, input, isNavigationMode(mode) ? mode : 'auto')
  }
  ipcMain.on(channels.navigate, listener)
  return () => ipcMain.removeListener(channels.navigate, listener)
}
