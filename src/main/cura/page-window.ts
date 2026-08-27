import { BrowserWindow, screen, type WebContents, type WebContentsView } from 'electron'
import { join } from 'node:path'
import type { WindowStateRepository } from '../tabularium/repositories/window-state-repo.js'
import { clampWindowBounds } from '../anulus/window-bounds.js'
import { normalizeDevelopmentRendererUrl } from './navigation-url.js'

const PAGE_BAR_HEIGHT = 42

export interface PageWindowOptions {
  ownerId(): string
  title: string
  view: WebContentsView
  alwaysOnTop: boolean
  opacity: number
  onFocus(): void
  onClosed(rendererFailed: boolean): void
  onWebContentsCreated(window: BrowserWindow, webContents: WebContents): void
  onRendererReady(window: BrowserWindow): void
}

/** @implements SPEC-ORBIS-P8-PAGE-WINDOW SPEC-ORBIS-BORDERLESS-WINDOW A visible page owns exactly one frameless BrowserWindow. */
export class PageWindowFactory {
  constructor(private readonly states?: WindowStateRepository) {}

  /** @implements SPEC-ORBIS-BORDERLESS-WINDOW */
  create(options: PageWindowOptions): BrowserWindow {
    const saved = this.states?.get('page', options.ownerId())
    const display = saved
      ? screen.getAllDisplays().find((candidate) => String(candidate.id) === saved.displayId)
        ?? screen.getDisplayMatching(saved)
      : undefined
    const bounds = saved && display ? clampWindowBounds(saved, display.workArea) : undefined
    const window = new BrowserWindow({
      width: bounds?.width ?? 1080,
      height: bounds?.height ?? 760,
      x: bounds?.x,
      y: bounds?.y,
      show: saved?.visible ?? true,
      title: options.title,
      frame: false,
      alwaysOnTop: options.alwaysOnTop,
      opacity: options.opacity,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    let rendererFailed = false

    window.contentView.addChildView(options.view)
    options.onWebContentsCreated(window, window.webContents)
    options.onWebContentsCreated(window, options.view.webContents)
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (event) => event.preventDefault())
    /** @implements SPEC-ORBIS-P8-PAGE-WINDOW A privileged control renderer must fail closed without its preload boundary. */
    window.webContents.on('preload-error', () => {
      rendererFailed = true
      if (!window.isDestroyed()) window.destroy()
    })

    const saveState = (visible = window.isVisible() && !window.isMinimized()): void => {
      const currentBounds = window.getBounds()
      this.states?.save({
        ownerKind: 'page',
        ownerId: options.ownerId(),
        displayId: String(screen.getDisplayMatching(currentBounds).id),
        ...currentBounds,
        visible
      })
    }
    const layout = (): void => {
      const contentBounds = window.getContentBounds()
      options.view.setBounds({
        x: 0,
        y: PAGE_BAR_HEIGHT,
        width: Math.max(0, contentBounds.width),
        height: Math.max(0, contentBounds.height - PAGE_BAR_HEIGHT)
      })
    }

    window.on('resize', () => { layout(); saveState() })
    window.on('move', () => saveState())
    window.on('minimize', () => saveState(false))
    window.on('restore', () => saveState(true))
    window.on('show', () => saveState(true))
    window.on('hide', () => saveState(false))
    window.on('focus', options.onFocus)
    window.on('closed', () => options.onClosed(rendererFailed))

    const rendererUrl = process.env.ELECTRON_RENDERER_URL
      ? new URL('page.html', normalizeDevelopmentRendererUrl(process.env.ELECTRON_RENDERER_URL)).toString()
      : null
    void (rendererUrl
      ? window.loadURL(rendererUrl)
      : window.loadFile(join(__dirname, '../renderer/page.html')))
      .catch(() => {
        rendererFailed = true
        if (!window.isDestroyed()) window.destroy()
      })
    window.webContents.once('did-finish-load', () => options.onRendererReady(window))
    layout()
    return window
  }
}
