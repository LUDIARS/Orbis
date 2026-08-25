import { BrowserWindow, screen } from 'electron'
import { join } from 'node:path'
import type { WindowStateRepository } from '../tabularium/repositories/window-state-repo.js'
import { normalizeDevelopmentRendererUrl } from '../cura/navigation-url.js'
import { clampWindowBounds } from '../anulus/window-bounds.js'

/** @implements SPEC-ORBIS-P8-SPECULUM Speculum は close を hide に置き換えた常設グラフウインドウ。 */
export class SpeculumWindow {
  private window: BrowserWindow | undefined
  private isDestroying = false
  constructor(private readonly states: WindowStateRepository) {}
  open(forceShow = false): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) {
      if (forceShow) {
        if (this.window.isMinimized()) this.window.restore()
        this.window.show()
      }
      return this.window
    }
    const saved = this.states.get('speculum', 'singleton')
    const display = saved
      ? screen.getAllDisplays().find((candidate) => String(candidate.id) === saved.displayId) ?? screen.getDisplayMatching(saved)
      : undefined
    const bounds = saved && display ? clampWindowBounds(saved, display.workArea) : undefined
    const window = new BrowserWindow({ width: bounds?.width ?? 420, height: bounds?.height ?? 520, x: bounds?.x, y: bounds?.y, show: forceShow || saved?.visible !== false, frame: false, title: 'Speculum', webPreferences: { preload: join(__dirname, '../preload/index.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } })
    this.window = window
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    /** @implements SPEC-ORBIS-P8-SPECULUM A privileged shell renderer must fail closed without its preload boundary. */
    window.webContents.on('preload-error', () => {
      if (!window.isDestroyed()) window.destroy()
    })
    const url = process.env.ELECTRON_RENDERER_URL ? new URL('speculum.html', normalizeDevelopmentRendererUrl(process.env.ELECTRON_RENDERER_URL)).toString() : null
    void (url ? window.loadURL(url) : window.loadFile(join(__dirname, '../renderer/speculum.html')))
      .catch(() => { if (!window.isDestroyed()) window.destroy() })
    const saveState = (visible = window.isVisible() && !window.isMinimized()): void => {
      const currentBounds = window.getBounds()
      this.states.save({ ownerKind: 'speculum', ownerId: 'singleton', displayId: String(screen.getDisplayMatching(currentBounds).id), ...currentBounds, visible })
    }
    window.on('move', () => saveState())
    window.on('resize', () => saveState())
    window.on('minimize', () => saveState(false))
    window.on('restore', () => saveState(true))
    window.on('show', () => saveState(true))
    window.on('hide', () => saveState(false))
    window.on('close', (event) => {
      if (window.isDestroyed()) return
      saveState(false)
      if (this.isDestroying) return
      event.preventDefault()
      window.hide()
    })
    window.on('closed', () => { if (this.window === window) this.window = undefined })
    return window
  }
  /** @implements SPEC-ORBIS-P8-SPECULUM Anulus から常設グラフを畳む・戻す。 */
  toggle(): void {
    const window = this.windowForIpc()
    if (!window) { this.open(true); return }
    if (window.isVisible()) {
      window.hide()
    } else {
      if (window.isMinimized()) window.restore()
      window.show()
      window.focus()
    }
  }
  /** @implements SPEC-ORBIS-P8-SPECULUM 終了時だけ常設ウインドウを破棄する。 */
  destroy(): void {
    const window = this.windowForIpc()
    if (!window) return
    const bounds = window.getBounds()
    this.states.save({ ownerKind: 'speculum', ownerId: 'singleton', displayId: String(screen.getDisplayMatching(bounds).id), ...bounds, visible: window.isVisible() && !window.isMinimized() })
    this.isDestroying = true
    window.destroy()
    this.isDestroying = false
  }
  windowForIpc(): BrowserWindow | undefined { return this.window && !this.window.isDestroyed() ? this.window : undefined }
}
