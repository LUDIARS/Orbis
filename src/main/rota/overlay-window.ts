import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { channels, type RotaSnapshot } from '../../shared/ipc-contract.js'
import { normalizeDevelopmentRendererUrl } from '../cura/navigation-url.js'

export interface RotaOverlayWindowOptions {
  loadUrl: string | null
  preloadPath: string
}

/**
 * 常駐 Rota ウインドウの寿命を所有し、close は破棄せず hide へ変換する。
 * @implements SPEC-ORBIS-P4-OVERLAY
 */
export class RotaOverlayWindow {
  private window: BrowserWindow | null = null
  private snapshot: RotaSnapshot = { curas: [] }
  private isRendererReady = false

  constructor(private readonly options: RotaOverlayWindowOptions) {}

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  open(snapshot: RotaSnapshot): void {
    this.snapshot = snapshot
    const window = this.ensureWindow()
    this.publishSnapshot()
    window.show()
    window.focus()
  }

  /** @implements SPEC-ORBIS-P4-SNAPSHOT */
  update(snapshot: RotaSnapshot): void {
    this.snapshot = snapshot
    this.publishSnapshot()
  }

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  rendererReady(): void {
    this.isRendererReady = true
    this.publishSnapshot()
  }

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  close(): void {
    if (this.window && !this.window.isDestroyed()) this.window.hide()
  }

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  destroy(): void {
    if (this.window && !this.window.isDestroyed()) this.window.destroy()
  }

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  isOverlay(senderId: number): boolean {
    return Boolean(this.window && !this.window.isDestroyed() && this.window.webContents.id === senderId)
  }

  /** @implements SPEC-ORBIS-P4-OVERLAY */
  private ensureWindow(): BrowserWindow {
    if (this.window && !this.window.isDestroyed()) return this.window
    this.isRendererReady = false
    const window = new BrowserWindow({
      width: 1080,
      height: 680,
      center: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      alwaysOnTop: true,
      skipTaskbar: true,
      show: false,
      webPreferences: {
        preload: this.options.preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    window.setAlwaysOnTop(true, 'screen-saver')
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    window.webContents.on('will-redirect', (event) => {
      try {
        normalizeDevelopmentRendererUrl(event.url)
      } catch {
        event.preventDefault()
      }
    })
    window.on('close', (event) => {
      if (!window.isDestroyed()) {
        event.preventDefault()
        window.hide()
      }
    })
    window.on('closed', () => {
      if (this.window === window) this.window = null
      this.isRendererReady = false
    })
    window.webContents.once('did-finish-load', () => {
      this.isRendererReady = true
      this.publishSnapshot()
    })
    window.webContents.on('preload-error', () => window.destroy())
    const load = this.options.loadUrl
      ? window.loadURL(this.options.loadUrl)
      : window.loadFile(join(__dirname, '../renderer/rota.html'))
    void load.catch(() => window.destroy())
    this.window = window
    return window
  }

  /** @implements SPEC-ORBIS-P4-SNAPSHOT */
  private publishSnapshot(): void {
    if (!this.isRendererReady || !this.window || this.window.isDestroyed()) return
    this.window.webContents.send(channels.rotaSnapshot, this.snapshot)
  }
}
