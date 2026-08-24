import { BrowserWindow, WebContentsView, type WebContents } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { CuraController } from '../actions/types.js'
import { applyAlwaysOnTop, applyOpacity, minimizeNonPinned } from '../fenestra/actions.js'
import { channels } from '../ipc/channels.js'
import type { Cura } from '../tabularium/repositories/cura-repo.js'
import type { NavigationKind, Page, PageRepository } from '../tabularium/repositories/page-repo.js'
import type { GraphLayout } from '../../shared/ipc-contract.js'
import { GraphStore } from '../nexus/graph-store.js'
import { resolveNavigationParent } from '../nexus/navigation-tracker.js'
import { normalizeGraphUrl } from '../nexus/url-normalizer.js'
import {
  isAllowedNavigationUrl,
  normalizeDevelopmentRendererUrl,
  normalizeNavigationUrl
} from './navigation-url.js'

const TOOLBAR_HEIGHT = 88
const GRAPH_PANE_WIDTH = 300
const DEFAULT_URL = 'https://example.com'

interface CuraPage {
  page: Page
  view: WebContentsView
  hasCommittedNavigation: boolean
  initialFromPageId: string | null
  initialNavigationKind: NavigationKind
}

/** Cura 1 つ = BrowserWindow 1 つ。各アクティブ page は固有の WebContentsView を持つ。 */
interface CuraWindow {
  cura: Cura
  window: BrowserWindow
  pages: CuraPage[]
  activeViewId: number | null
  graphPaneCollapsed: boolean
}

export interface CuraWindowFactoryHooks {
  onNewCura(): void
  onCuraChanged(cura: Cura): void
  onWebContentsCreated(window: BrowserWindow, webContents: WebContents): void
}

/** @implements SPEC-ORBIS-P0-CURA */
export class CuraWindowFactory implements CuraController {
  private readonly windows = new Map<number, CuraWindow>()

  constructor(
    private readonly pageRepository: PageRepository,
    private readonly hooks: CuraWindowFactoryHooks,
    private readonly graphStore: GraphStore
  ) {}

  create(cura: Cura, restore: Page[] = []): BrowserWindow {
    const developmentRendererUrl = process.env.ELECTRON_RENDERER_URL
      ? normalizeDevelopmentRendererUrl(process.env.ELECTRON_RENDERER_URL)
      : null
    const window = new BrowserWindow({
      width: 1280,
      height: 860,
      title: cura.title,
      alwaysOnTop: cura.alwaysOnTop,
      opacity: cura.opacity,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    const entry: CuraWindow = { cura, window, pages: [], activeViewId: null, graphPaneCollapsed: false }
    this.graphStore.restore(cura.id, this.pageRepository.graphByCura(cura.id))
    this.windows.set(window.id, entry)
    this.hooks.onWebContentsCreated(window, window.webContents)

    window.webContents.on('preload-error', () => {
      console.error('Unable to load the Cura preload bridge.')
      if (!window.isDestroyed()) window.destroy()
    })
    window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    window.webContents.on('will-navigate', (details) => details.preventDefault())
    window.webContents.on('will-redirect', (details) => {
      try {
        normalizeDevelopmentRendererUrl(details.url)
      } catch {
        details.preventDefault()
      }
    })
    const uiLoad = developmentRendererUrl
      ? window.loadURL(developmentRendererUrl)
      : window.loadFile(join(__dirname, '../renderer/index.html'))
    void uiLoad.catch(() => {
      console.error('Unable to load the Cura renderer.')
      if (!window.isDestroyed()) window.destroy()
    })

    window.webContents.once('did-finish-load', () => {
      window.webContents.send(channels.fenestraState, {
        alwaysOnTop: cura.alwaysOnTop,
        opacity: cura.opacity
      })
      for (const page of restore) this.createPage(entry, page.url, null, 'navigate', page, false)
      const restoredPage = entry.pages.at(-1)
      if (restoredPage) this.activatePage(entry, restoredPage)
      else this.createPage(entry, DEFAULT_URL)
    })
    window.on('resize', () => this.layoutView(entry))
    window.on('closed', () => {
      for (const tab of entry.pages) {
        if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close()
      }
      this.windows.delete(window.id)
    })
    return window
  }

  resolveUiWindow(senderId: number): BrowserWindow | undefined {
    return [...this.windows.values()].find((entry) => entry.window.webContents.id === senderId)?.window
  }

  publishState(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    this.sendPages(entry)
    window.webContents.send(channels.fenestraState, this.fenestraState(entry))
  }

  navigate(window: BrowserWindow, value: string): void {
    const entry = this.entryOf(window)
    if (!entry) return
    let url: string
    try {
      url = normalizeNavigationUrl(value)
    } catch (error) {
      this.reportNavigationError(entry, error instanceof Error ? error.message : 'The URL is invalid.')
      return
    }
    const active = this.activePage(entry)
    if (!active) {
      this.createPage(entry, url)
      return
    }
    void active.view.webContents.loadURL(url).catch(() => {
      this.reportNavigationError(entry, 'Unable to load this URL.')
    })
  }

  selectPage(window: BrowserWindow, pageId: string): void {
    const entry = this.entryOf(window)
    const page = entry?.pages.find((candidate) => candidate.page.id === pageId)
    if (entry && page) this.activatePage(entry, page)
  }

  search(window: BrowserWindow, query: string): string[] { const entry = this.entryOf(window); return entry ? this.pageRepository.search(entry.cura.id, query) : [] }
  setGraphPane(window: BrowserWindow, collapsed: boolean, _layout?: GraphLayout): void { const entry = this.entryOf(window); if (!entry) return; entry.graphPaneCollapsed = collapsed; this.layoutView(entry) }
  focusSearch(window: BrowserWindow): void { window.webContents.send(channels.focusSearch) }
  toggleGraphLayout(window: BrowserWindow): void { window.webContents.send(channels.toggleGraphLayout) }
  savePageContent(senderId: number, content: string): void { for (const entry of this.windows.values()) { const tab = entry.pages.find((item) => item.view.webContents.id === senderId); if (tab) { this.pageRepository.saveContent(tab.page, content); return } } }

  goBack(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const history = entry && this.activePage(entry)?.view.webContents.navigationHistory
    if (history?.canGoBack()) history.goBack()
  }

  goForward(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const history = entry && this.activePage(entry)?.view.webContents.navigationHistory
    if (history?.canGoForward()) history.goForward()
  }

  reload(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (entry) this.activePage(entry)?.view.webContents.reload()
  }

  newPage(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (entry) this.createPage(entry, DEFAULT_URL, this.activePage(entry)?.page.id ?? null, 'newview')
  }

  closePage(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const active = entry && this.activePage(entry)
    if (!entry || !active) return

    entry.window.contentView.removeChildView(active.view)
    this.pageRepository.deactivate(active.page.id)
    if (!active.view.webContents.isDestroyed()) active.view.webContents.close()
    entry.pages = entry.pages.filter((candidate) => candidate !== active)
    entry.activeViewId = null

    const next = entry.pages.at(-1)
    if (next) this.activatePage(entry, next)
    else this.createPage(entry, DEFAULT_URL)
  }

  newCura(): void {
    this.hooks.onNewCura()
  }

  toggleAlwaysOnTop(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const next = applyAlwaysOnTop(window, this.fenestraState(entry))
    this.persistFenestra(entry, next.alwaysOnTop, next.opacity)
  }

  cycleOpacity(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const next = applyOpacity(window, this.fenestraState(entry))
    this.persistFenestra(entry, next.alwaysOnTop, next.opacity)
  }

  minimizeOthers(): void {
    minimizeNonPinned([...this.windows.values()].map((entry) => entry.window))
  }

  private entryOf(window: BrowserWindow): CuraWindow | undefined {
    return this.windows.get(window.id)
  }

  private activePage(entry: CuraWindow): CuraPage | undefined {
    return entry.pages.find((page) => page.view.webContents.id === entry.activeViewId)
  }

  private fenestraState(entry: CuraWindow): { alwaysOnTop: boolean; opacity: number } {
    return { alwaysOnTop: entry.cura.alwaysOnTop, opacity: entry.cura.opacity }
  }

  private persistFenestra(entry: CuraWindow, alwaysOnTop: boolean, opacity: number): void {
    entry.cura = { ...entry.cura, alwaysOnTop, opacity }
    this.hooks.onCuraChanged(entry.cura)
    entry.window.webContents.send(channels.fenestraState, { alwaysOnTop, opacity })
  }

  private createPage(
    entry: CuraWindow,
    value: string,
    fromPageId: string | null = null,
    navigationKind: NavigationKind = 'navigate',
    restoredPage?: Page,
    activate = true
  ): void {
    let url: string
    try {
      url = normalizeNavigationUrl(value)
    } catch (error) {
      this.reportNavigationError(entry, error instanceof Error ? error.message : 'The URL is invalid.')
      return
    }

    const view = new WebContentsView({
      webPreferences: { preload: join(__dirname, '../preload/page-bridge.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
    })
    const now = new Date().toISOString()
    const normalizedUrl = normalizeGraphUrl(url)
    const existingPage = this.pageRepository.findActiveByUrl(entry.cura.id, normalizedUrl)
    const page: Page = restoredPage
      ? { ...restoredPage, url, active: true }
      : existingPage
        ? { ...existingPage, lastVisit: now }
      : {
          id: randomUUID(),
          curaId: entry.cura.id,
      url: normalizedUrl,
          title: url,
          firstVisit: now,
          lastVisit: now,
          active: true
        }
    const tab: CuraPage = {
      page,
      view,
      hasCommittedNavigation: false,
      initialFromPageId: fromPageId,
      initialNavigationKind: navigationKind
    }
    entry.pages.push(tab)
    this.hooks.onWebContentsCreated(entry.window, view.webContents)

    view.webContents.on('will-navigate', (details) => this.guardNavigation(entry, details, details.url))
    view.webContents.on('will-redirect', (details) => this.guardNavigation(entry, details, details.url))
    view.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      this.createPage(entry, nextUrl, tab.page.id, 'newview')
      return { action: 'deny' }
    })
    view.webContents.on('did-navigate', (_event, nextUrl) => this.commitNavigation(entry, tab, nextUrl))
    view.webContents.on('did-navigate-in-page', (_event, nextUrl) => this.commitNavigation(entry, tab, nextUrl))
    view.webContents.on('page-title-updated', (_event, title) => {
      const updatedPage = { ...tab.page, title }
      this.pageRepository.save(updatedPage)
      tab.page = updatedPage
      this.sendPages(entry)
    })

    if (activate) this.activatePage(entry, tab)
    else this.sendPages(entry)
    void view.webContents.loadURL(normalizedUrl).catch(() => {
      this.reportNavigationError(entry, 'Unable to load this URL.')
    })
  }

  private commitNavigation(entry: CuraWindow, tab: CuraPage, nextUrl: string): void {
    if (!isAllowedNavigationUrl(nextUrl)) return
    const now = new Date().toISOString()
    const normalizedUrl = normalizeGraphUrl(nextUrl)

    if (!tab.hasCommittedNavigation) {
      const committedPage = {
        ...tab.page,
        url: normalizedUrl,
        title: tab.view.webContents.getTitle() || normalizedUrl,
        lastVisit: now
      }
      this.pageRepository.recordNavigation(
        entry.cura.id,
        tab.initialFromPageId,
        committedPage,
        tab.initialNavigationKind
      )
      tab.page = committedPage
      this.updateGraph(entry, committedPage, tab.initialFromPageId, tab.initialNavigationKind)
      tab.hasCommittedNavigation = true
      this.sendPages(entry)
      return
    }

    if (tab.page.url === normalizedUrl) {
      const reloadedPage = { ...tab.page, lastVisit: now }
      this.pageRepository.recordNavigation(entry.cura.id, null, reloadedPage)
      tab.page = reloadedPage
      this.sendPages(entry)
      return
    }

    const previousPage = tab.page
    const nextPage: Page = {
      id: randomUUID(),
      curaId: entry.cura.id,
      url: normalizedUrl,
      title: tab.view.webContents.getTitle() || normalizedUrl,
      firstVisit: now,
      lastVisit: now,
      active: true
    }
    const existingPage = this.pageRepository.findActiveByUrl(entry.cura.id, normalizedUrl)
    const resolvedPage = existingPage ? { ...existingPage, lastVisit: now } : nextPage
    this.pageRepository.recordNavigation(entry.cura.id, previousPage.id, resolvedPage, 'navigate', !existingPage)
    tab.page = resolvedPage
    this.updateGraph(entry, resolvedPage, resolveNavigationParent(true, previousPage.id, null), 'navigate')
    this.sendPages(entry)
    this.sendGraph(entry)
  }

  private activatePage(entry: CuraWindow, page: CuraPage): void {
    const previous = this.activePage(entry)
    if (previous && previous !== page) entry.window.contentView.removeChildView(previous.view)
    if (previous !== page) entry.window.contentView.addChildView(page.view)
    entry.activeViewId = page.view.webContents.id
    this.layoutView(entry)
    page.view.webContents.focus()
    this.sendPages(entry)
  }

  private sendPages(entry: CuraWindow): void {
    if (entry.window.isDestroyed() || entry.window.webContents.isDestroyed()) return
    entry.window.webContents.send(channels.pages, {
      pages: entry.pages.map(({ page }) => ({ id: page.id, title: page.title, url: page.url })),
      activePageId: this.activePage(entry)?.page.id ?? null
    })
  }

  private sendGraph(entry: CuraWindow): void { if (!entry.window.isDestroyed() && !entry.window.webContents.isDestroyed()) entry.window.webContents.send(channels.graph, this.graphStore.snapshot(entry.cura.id, this.activePage(entry)?.page.id ?? null)) }
  private updateGraph(entry: CuraWindow, page: Page, fromPageId: string | null, kind: NavigationKind): void { this.graphStore.addNode(entry.cura.id, { id: page.id, url: page.url, title: page.title, lastVisit: page.lastVisit }); if (fromPageId) this.graphStore.addEdge(entry.cura.id, { from: fromPageId, to: page.id, kind, count: 1, lastAt: page.lastVisit }) }

  private reportNavigationError(entry: CuraWindow, message: string): void {
    if (!entry.window.webContents.isDestroyed()) {
      entry.window.webContents.send(channels.navigationError, message)
    }
  }

  private guardNavigation(entry: CuraWindow, event: Electron.Event, nextUrl: string): void {
    if (isAllowedNavigationUrl(nextUrl)) return
    event.preventDefault()
    this.reportNavigationError(entry, 'Only HTTP and HTTPS URLs without credentials are supported.')
  }

  private layoutView(entry: CuraWindow): void {
    const active = this.activePage(entry)
    if (!active) return
    const bounds = entry.window.getContentBounds()
    active.view.setBounds({
      x: entry.graphPaneCollapsed ? 0 : GRAPH_PANE_WIDTH,
      y: TOOLBAR_HEIGHT,
      width: Math.max(0, bounds.width - (entry.graphPaneCollapsed ? 0 : GRAPH_PANE_WIDTH)),
      height: Math.max(0, bounds.height - TOOLBAR_HEIGHT)
    })
  }
}
