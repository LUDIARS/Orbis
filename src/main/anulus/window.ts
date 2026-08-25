import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { WindowStateRepository } from '../tabularium/repositories/window-state-repo.js'
import { normalizeDevelopmentRendererUrl } from '../cura/navigation-url.js'
import { clampWindowBounds } from './window-bounds.js'

/** @implements SPEC-ORBIS-P8-ANULUS Anulus は一プロセス一枚だけ生成する。 */
export class AnulusWindow {
  private window: BrowserWindow | undefined
  private isDestroying = false
  constructor(private readonly states: WindowStateRepository) {}
  open(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      if (this.window.isMinimized()) this.window.restore()
      this.window.show()
      return this.window
    }
    const saved = this.states.get('anulus', 'singleton')
    const display = saved
      ? screen.getAllDisplays().find((candidate) => String(candidate.id) === saved.displayId) ?? screen.getDisplayMatching(saved)
      : undefined
    const bounds = saved && display ? clampWindowBounds(saved, display.workArea) : undefined
    const window = new BrowserWindow({ width: bounds?.width ?? 270, height: bounds?.height ?? 270, x: bounds?.x, y: bounds?.y, frame: false, transparent: true, alwaysOnTop: true, resizable: false, webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
    this.window = window
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    /** @implements SPEC-ORBIS-P8-ANULUS A privileged shell renderer must fail closed without its preload boundary. */
    window.webContents.on('preload-error', () => {
      if (!window.isDestroyed()) window.destroy()
    })
    const url = process.env.ELECTRON_RENDERER_URL ? new URL('anulus.html', normalizeDevelopmentRendererUrl(process.env.ELECTRON_RENDERER_URL)).toString() : null
    void (url ? window.loadURL(url) : window.loadFile(join(__dirname, '../renderer/anulus.html')))
      .catch(() => { if (!window.isDestroyed()) window.destroy() })
    const saveState = (visible = window.isVisible() && !window.isMinimized()): void => {
      const currentBounds = window.getBounds()
      this.states.save({ ownerKind: 'anulus', ownerId: 'singleton', displayId: String(screen.getDisplayMatching(currentBounds).id), ...currentBounds, visible })
    }
    window.on('move', () => saveState())
    window.on('show', () => saveState(true))
    window.on('hide', () => saveState(false))
    window.on('close', (event) => {
      saveState(false)
      if (this.isDestroying) return
      event.preventDefault()
      window.hide()
    })
    window.on('closed', () => { if (this.window === window) this.window = undefined })
    return window
  }
  destroy(): void {
    const window = this.windowForIpc()
    if (!window) return
    const currentBounds = window.getBounds()
    this.states.save({ ownerKind: 'anulus', ownerId: 'singleton', displayId: String(screen.getDisplayMatching(currentBounds).id), ...currentBounds, visible: window.isVisible() && !window.isMinimized() })
    this.isDestroying = true
    window.destroy()
    this.isDestroying = false
  }
  windowForIpc(): BrowserWindow | undefined { return this.window && !this.window.isDestroyed() ? this.window : undefined }
}
