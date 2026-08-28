import { WebContentsView, type BrowserWindow, type WebContents } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import type { CuraController } from '../actions/types.js'
import { applyAlwaysOnTop, applyOpacity, minimizeNonPinned } from '../fenestra/actions.js'
import { channels } from '../ipc/channels.js'
import type { Cura } from '../tabularium/repositories/cura-repo.js'
import type { NavigationKind, Page, PageRepository } from '../tabularium/repositories/page-repo.js'
import type { GraphLayout } from '../../shared/ipc-contract.js'
import { GraphStore } from '../nexus/graph-store.js'
import { navigationKindForNewView, resolveNavigationParent } from '../nexus/navigation-tracker.js'
import { normalizeGraphUrl } from '../nexus/url-normalizer.js'
import type { WindowStateRepository } from '../tabularium/repositories/window-state-repo.js'
import { HabitusService } from '../habitus/service.js'
import type { HabitusId } from '../habitus/types.js'
import { applyEmulation } from '../habitus/emulation.js'
import { ComparatioService } from '../comparatio/service.js'
import { FormaRegistry } from '../forma/registry.js'
import { injectForma } from '../forma/injector.js'
import { selectUmbraEvictions } from '../umbra/service.js'
import { googleSearchUrl } from '../forma/sites/google/search-url.js'
import { resolveNavigationTarget, type NavigationMode } from '../../shared/navigation-intent.js'
import {
  isAllowedExplorationUrl,
  isAllowedNavigationUrl,
  normalizeNavigationUrl
} from './navigation-url.js'
import { PageWindowFactory } from './page-window.js'
import type { VitrumService } from '../vitrum/service.js'

interface CuraPage {
  page: Page
  view: WebContentsView
  /** P8: a visible page owns its BrowserWindow; Umbra deliberately has none. */
  window?: BrowserWindow
  hasCommittedNavigation: boolean
  initialFromPageId: string | null
  initialNavigationKind: NavigationKind
  habitusId: HabitusId
  umbra: boolean
  llmNavigationPending: boolean
  /** pageSigillum は view ごとに安定 (§7.2)。page.id の再利用や URL 遷移から独立して解決する。 */
  viewKey: string
  disposeVitrum?: () => void
}

/** A Cura is a logical owner of independently rendered page windows. */
interface CuraEntry {
  cura: Cura
  pages: CuraPage[]
  activeViewId: number | null
  graphPaneCollapsed: boolean
  comparatioOpen: boolean
  settingsPaneOpen: boolean
  /** スタート画面から開くページの親 (グラフのエッジ元)。 スタート画面を出していない間は null。 */
  startParentPageId: string | null
}

export interface CuraWindowFactoryHooks {
  onNewCura(): void
  onFocusAnulus(): void
  onCuraChanged(cura: Cura): void
  onWebContentsCreated(window: BrowserWindow, webContents: WebContents): void
  onPageCreated?(curaId: string, pageId: string, webContents: WebContents): void
  onCuraClosed?(curaId: string): void
  onRevealUmbra?(curaId: string, pageId: string): void
  onPageClosed?(curaId: string, pageId: string): void
  onGraphChanged?(curaId: string, state: import('../../shared/ipc-contract.js').GraphViewState): void
}

/** @implements SPEC-ORBIS-P0-CURA SPEC-ORBIS-P8-PAGE-WINDOW */
export class CuraWindowFactory implements CuraController {
  private readonly windows = new Map<string, CuraEntry>()
  private readonly pageWindows: PageWindowFactory
  private activeCuraId: string | null = null
  private isQuitting = false

  constructor(
    private readonly pageRepository: PageRepository,
    private readonly hooks: CuraWindowFactoryHooks,
    private readonly graphStore: GraphStore,
    private readonly habitusService: HabitusService,
    private readonly comparatioService: ComparatioService,
    private readonly formaRegistry: FormaRegistry,
    private readonly vitrum: VitrumService,
    windowStates?: WindowStateRepository
  ) {
    this.pageWindows = new PageWindowFactory(windowStates)
  }

  create(cura: Cura, restore: Page[] = []): void {
    if (this.windows.has(cura.id)) return
    const entry: CuraEntry = { cura, pages: [], activeViewId: null, graphPaneCollapsed: false, comparatioOpen: cura.habitusId === 'shopping', settingsPaneOpen: false, startParentPageId: null }
    this.activeCuraId ??= cura.id
    this.graphStore.restore(cura.id, this.pageRepository.graphByCura(cura.id))
    this.windows.set(cura.id, entry)
    for (const page of restore.filter((candidate) => !candidate.umbra)) {
      this.createPage(entry, page.url, null, 'navigate', page, false)
    }
    entry.activeViewId = entry.pages.find((page) => !page.umbra)?.view.webContents.id ?? null
    this.publishShellState(entry)
  }

  resolveUiWindow(senderId: number): BrowserWindow | undefined {
    for (const entry of this.windows.values()) {
      const page = entry.pages.find((candidate) => candidate.window?.webContents.id === senderId)
      if (page?.window) return page.window
    }
    return undefined
  }

  /** @implements SPEC-ORBIS-P3-GESTUS */
  resolveWindow(senderId: number): BrowserWindow | undefined {
    for (const entry of this.windows.values()) {
      const page = entry.pages.find((candidate) => candidate.window?.webContents.id === senderId || candidate.view.webContents.id === senderId)
      if (page?.window) return page.window
    }
    return undefined
  }

  /** @implements SPEC-ORBIS-P8-PAGE-WINDOW Global actions target the active visible page, even while a shell window has focus. */
  activePageWindow(): BrowserWindow | undefined {
    const entry = this.activeCuraId ? this.windows.get(this.activeCuraId) : undefined
    const window = entry
      ? (this.activePage(entry) ?? entry.pages.find((page) => !page.umbra))?.window
      : undefined
    return window && !window.isDestroyed() ? window : undefined
  }

  publishState(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    this.sendPages(entry)
    window.webContents.send(channels.fenestraState, this.fenestraState(entry))
    this.sendHabitus(entry)
    this.sendComparatio(entry)
  }

  /** @implements SPEC-ORBIS-P8-ANULUS Cura is a logical owner, not a hidden BrowserWindow. */
  activateCura(curaId: string): BrowserWindow | undefined {
    const entry = this.windows.get(curaId)
    if (!entry) return undefined
    this.activeCuraId = curaId
    entry.cura = { ...entry.cura, lastActiveAt: new Date().toISOString() }
    this.hooks.onCuraChanged(entry.cura)
    this.publishShellState(entry)
    return (this.activePage(entry) ?? entry.pages.find((page) => !page.umbra))?.window
  }

  prepareToQuit(): void {
    this.isQuitting = true
  }

  /** Anulus opens a new view in the selected logical Cura. */
  openInCura(curaId: string, value: string, mode: NavigationMode = 'auto'): void {
    const entry = this.windows.get(curaId)
    if (!entry) return
    this.activeCuraId = curaId
    this.navigateEntry(entry, value, mode)
  }

  /** @implements SPEC-ORBIS-P7-START-SCREEN 入力欄の 1 行を URL か検索語として解決してから開く。 */
  navigate(window: BrowserWindow, value: string, mode: NavigationMode = 'auto'): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const active = this.pageForWindow(entry, window) ?? this.activePage(entry)
    this.navigateEntry(entry, value, mode, active)
  }

  private navigateEntry(entry: CuraEntry, value: string, mode: NavigationMode, active?: CuraPage): void {
    const target = resolveNavigationTarget(value, mode)
    if (!target) return
    let url: string
    try {
      const destination = target.kind === 'search' ? googleSearchUrl(target.value) : target.value
      url = normalizeNavigationUrl(destination)
    } catch (error) {
      this.reportNavigationError(entry, error instanceof Error ? error.message : 'The URL is invalid.')
      return
    }
    if (!active) {
      // スタート画面からの入力。 親ページが分かっていればグラフのエッジを残す。
      const parent = entry.startParentPageId
      entry.startParentPageId = null
      this.createPage(entry, url, parent, parent ? navigationKindForNewView() : 'navigate')
      return
    }
    void active.view.webContents.loadURL(url).catch(() => {
      this.reportNavigationError(entry, 'Unable to load this URL.')
    })
  }

  selectPage(window: BrowserWindow, pageId: string): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const page = entry.pages.find((candidate) => candidate.page.id === pageId)
    if (page && page.umbra) {
      this.revealUmbra(entry, page)
      return
    }
    if (page) {
      this.activatePage(entry, page)
      return
    }
    const stored = this.pageRepository.listByCura(entry.cura.id).find((candidate) => candidate.id === pageId)
    if (stored?.umbra) {
      const revealed = this.createPage(entry, stored.url, null, 'navigate', { ...stored, umbra: false })
      if (revealed) this.hooks.onRevealUmbra?.(entry.cura.id, revealed.viewKey)
    }
  }

  /** Speculum は sender に Cura UI を持たないため、ページ ID から論理的な親 Cura を解決する。 */
  selectPageById(pageId: string): BrowserWindow | undefined {
    const found = this.findTab(pageId)
    if (found) {
      this.activeCuraId = found.entry.cura.id
      if (found.tab.umbra) this.revealUmbra(found.entry, found.tab)
      else this.activatePage(found.entry, found.tab)
      found.tab.window?.show()
      found.tab.window?.focus()
      return found.tab.window
    }
    for (const entry of this.windows.values()) {
      const stored = this.pageRepository.listByCura(entry.cura.id).find((page) => page.id === pageId)
      if (!stored) continue
      this.activeCuraId = entry.cura.id
      if (stored.umbra) {
        const revealed = this.createPage(entry, stored.url, null, 'navigate', { ...stored, umbra: false })
        if (revealed) this.hooks.onRevealUmbra?.(entry.cura.id, revealed.viewKey)
        return revealed?.window
      }
      return undefined
    }
    return undefined
  }

  graphSnapshot(curaId: string): import('../../shared/ipc-contract.js').GraphViewState {
    return this.graphStore.snapshot(curaId, null)
  }

  currentCuraId(): string | null {
    return this.activeCuraId
  }

  anulusSnapshot(): import('../../shared/ipc-contract.js').AnulusViewState {
    const active = this.activeCuraId ? this.windows.get(this.activeCuraId) : undefined
    return {
      activeCuraId: active?.cura.id ?? null,
      curas: [...this.windows.values()].map((entry) => ({
        id: entry.cura.id,
        title: entry.cura.title,
        color: entry.cura.color,
        active: entry.cura.id === active?.cura.id
      })),
      pages: active?.pages
        .filter((page) => !page.umbra)
        .map((page) => ({ id: page.page.id, title: page.page.title, curaId: active.cura.id }))
        ?? []
    }
  }

  /** @implements SPEC-ORBIS-P5-UMBRA */
  private revealUmbra(entry: CuraEntry, tab: CuraPage, recordUserAction = true): void {
    tab.umbra = false
    tab.page = { ...tab.page, umbra: false }
    this.pageRepository.save(tab.page)
    this.updateGraph(entry, tab.page, null, 'navigate')
    this.attachPageWindow(entry, tab)
    this.activatePage(entry, tab)
    if (recordUserAction) this.hooks.onRevealUmbra?.(entry.cura.id, tab.viewKey)
  }

  search(window: BrowserWindow, query: string): string[] { const entry = this.entryOf(window); return entry ? this.pageRepository.search(entry.cura.id, query) : [] }
  setGraphPane(window: BrowserWindow, collapsed: boolean, _layout?: GraphLayout): void { const entry = this.entryOf(window); if (entry) entry.graphPaneCollapsed = collapsed }
  /** @implements SPEC-ORBIS-P3-SETTINGS */
  setSettingsPaneOpen(window: BrowserWindow, open: boolean): void { const entry = this.entryOf(window); if (entry) entry.settingsPaneOpen = open }
  focusSearch(window: BrowserWindow): void { window.webContents.send(channels.focusSearch) }
  toggleGraphLayout(window: BrowserWindow): void { window.webContents.send(channels.toggleGraphLayout) }
  savePageContent(senderId: number, content: string): void { for (const entry of this.windows.values()) { const tab = entry.pages.find((item) => item.view.webContents.id === senderId); if (tab) { this.pageRepository.saveContent(tab.page, content); return } } }

  saveProductFacts(senderId: number, facts: import('../forma/sites/amazon/facts-extractor.js').ProductFacts): void {
    for (const entry of this.windows.values()) {
      const tab = entry.pages.find((item) => item.view.webContents.id === senderId)
      if (!tab || tab.habitusId !== 'shopping') continue
      const currentUrl = tab.view.webContents.getURL()
      const isAmazonForma = this.formaRegistry.matching(currentUrl, tab.habitusId)
        .some((forma) => forma.id === 'amazon')
      if (!isAmazonForma || facts.url !== currentUrl) return
      this.comparatioService.upsert(entry.cura.id, facts)
      this.sendComparatio(entry)
      return
    }
  }

  setHabitus(window: BrowserWindow, habitusId: HabitusId): void {
    const entry = this.entryOf(window)
    if (!entry || this.habitusService.getCuraDefault(entry.cura) === habitusId) return
    entry.cura = this.habitusService.setCuraDefault(entry.cura, habitusId)
    this.hooks.onCuraChanged(entry.cura)
    entry.comparatioOpen = habitusId === 'shopping'
    for (const tab of [...entry.pages]) {
      const resolvedHabitusId = this.habitusService.resolve(entry.cura, tab.page.id)
      if (tab.habitusId === resolvedHabitusId) continue
      const previous = this.habitusService.preset(tab.habitusId)
      const next = this.habitusService.preset(resolvedHabitusId)
      if (previous.partition === next.partition) {
        tab.habitusId = resolvedHabitusId
        this.applyPageHabitus(tab, next)
        continue
      }
      this.recreatePageForPartition(entry, tab, resolvedHabitusId)
    }
    this.sendHabitus(entry)
    this.sendComparatio(entry)
  }

  /** @implements SPEC-ORBIS-P3-CLAVIS */
  cycleHabitus(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const next: Record<HabitusId, HabitusId> = { desktop: 'mobile', mobile: 'shopping', shopping: 'desktop' }
    this.setHabitus(window, next[this.habitusService.getCuraDefault(entry.cura)])
  }

  /** @implements SPEC-ORBIS-VITRUM-APPLY */
  vitrumState(window: BrowserWindow): import('../../shared/ipc-contract.js').VitrumViewState {
    const entry = this.entryOf(window)
    const page = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))
    if (!entry || !page) throw new Error('The active page is unavailable.')
    return this.vitrum.stateFor(page.page.id, page.habitusId)
  }

  /** @implements SPEC-ORBIS-VITRUM-ACTION */
  setVitrum(window: BrowserWindow, spec: import('../../shared/ipc-contract.js').VitrumSpecView): import('../../shared/ipc-contract.js').VitrumViewState {
    const entry = this.entryOf(window)
    const page = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))
    if (!entry || !page) throw new Error('The active page is unavailable.')
    this.vitrum.savePage(page.page.id, spec)
    this.vitrum.apply(page.view.webContents, page.page.id, page.habitusId)
    return this.vitrum.stateFor(page.page.id, page.habitusId)
  }

  /** @implements SPEC-ORBIS-VITRUM-ACTION */
  cycleVitrum(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const page = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))
    if (!entry || !page) return
    this.vitrum.cycle(page.page.id, page.habitusId)
    this.vitrum.apply(page.view.webContents, page.page.id, page.habitusId)
  }

  toggleComparatio(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    entry.comparatioOpen = !entry.comparatioOpen
    this.sendComparatio(entry)
  }

  goBack(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const history = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))?.view.webContents.navigationHistory
    if (history?.canGoBack()) history.goBack()
  }

  goForward(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const history = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))?.view.webContents.navigationHistory
    if (history?.canGoForward()) history.goForward()
  }

  reload(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (entry) (this.pageForWindow(entry, window) ?? this.activePage(entry))?.view.webContents.reload()
  }

  /** @implements SPEC-ORBIS-P7-START-SCREEN 新しいページは行き先を聞いてから開く (既定 URL を勝手に開かない)。 */
  newPage(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    if (!entry) return
    const active = this.pageForWindow(entry, window) ?? this.activePage(entry)
    if (active) entry.startParentPageId = active.page.id
    this.hooks.onFocusAnulus()
  }

  closePage(window: BrowserWindow): void {
    const entry = this.entryOf(window)
    const active = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))
    if (!entry || !active) return

    active.window?.close()
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
    minimizeNonPinned([...this.windows.values()].flatMap((entry) => entry.pages.flatMap((page) => page.window ? [page.window] : [])))
  }

  /** @implements SPEC-ORBIS-P5-VINCULUM LLM が開く新規ページ。既定は Umbra (非描画)。 */
  openLlmPage(curaId: string, url: string, visible: boolean): { pageId: string } {
    const entry = [...this.windows.values()].find((candidate) => candidate.cura.id === curaId)
    if (!entry) throw new Error('The Cura window is not open.')
    const from = this.activePage(entry)?.page.id ?? null
    const tab = this.createPage(entry, url, from, 'llm', undefined, visible, undefined, !visible, false)
    if (!tab) throw new Error('The URL is invalid.')
    this.sendGraph(entry)
    return { pageId: tab.viewKey }
  }

  /** @implements SPEC-ORBIS-P6-EXPLORATIO Creates a non-visible traversal edge distinct from ordinary LLM navigation. */
  openExplorationPage(curaId: string, url: string, fromPageId: string | null): { pageId: string } {
    const entry = [...this.windows.values()].find((candidate) => candidate.cura.id === curaId)
    if (!entry) throw new Error('The Cura window is not open.')
    const from = fromPageId ? this.findTab(fromPageId)?.tab.page.id ?? null : null
    const tab = this.createPage(entry, url, from, 'explore', undefined, false, undefined, true, false)
    if (!tab) throw new Error('The exploration URL is not allowed.')
    this.sendGraph(entry)
    return { pageId: tab.viewKey }
  }

  /** @implements SPEC-ORBIS-P6-REVEAL Explicit Cc reveal reaches the same attach path as a user node selection. */
  revealLlmPage(pageId: string): void {
    const found = this.findTab(pageId)
    if (!found) throw new Error('The page is not open.')
    this.revealUmbra(found.entry, found.tab, false)
  }

  /** @implements SPEC-ORBIS-P5-VINCULUM 人間と同じ経路 (loadURL + commitNavigation) で遷移し、エッジは kind=llm で残す。 */
  async navigateLlmPage(pageId: string, url: string): Promise<void> {
    const found = this.findTab(pageId)
    if (!found) throw new Error('The page is not open.')
    const normalized = normalizeNavigationUrl(url)
    found.tab.llmNavigationPending = true
    try {
      await found.tab.view.webContents.loadURL(normalized)
    } finally {
      found.tab.llmNavigationPending = false
    }
  }

  pageWebContents(pageId: string): WebContents | undefined {
    return this.findTab(pageId)?.tab.view.webContents
  }

  pageSummary(pageId: string): { pageId: string; curaId: string; url: string; title: string; umbra: boolean } | undefined {
    const found = this.findTab(pageId)
    if (!found) return undefined
    return { pageId: found.tab.page.id, curaId: found.entry.cura.id, url: found.tab.page.url, title: found.tab.page.title, umbra: found.tab.umbra }
  }

  /** @implements SPEC-ORBIS-P5-SIGILLUM アドレスバーのスタンプ表示用。 */
  activePageInfo(window: BrowserWindow): { curaId: string; pageId: string } | null {
    const entry = this.entryOf(window)
    const active = entry && (this.pageForWindow(entry, window) ?? this.activePage(entry))
    return entry && active ? { curaId: entry.cura.id, pageId: active.viewKey } : null
  }

  private findTab(pageId: string): { entry: CuraEntry; tab: CuraPage } | undefined {
    for (const entry of this.windows.values()) {
      const tab = entry.pages.find((candidate) => candidate.page.id === pageId || candidate.viewKey === pageId)
      if (tab) return { entry, tab }
    }
    return undefined
  }

  /** @implements SPEC-ORBIS-P8-PAGE-WINDOW UI ウインドウを論理 Cura へ逆引きする。 */
  private entryOf(window: BrowserWindow): CuraEntry | undefined {
    return [...this.windows.values()].find((entry) => entry.pages.some((page) => page.window?.id === window.id))
  }

  /** @implements SPEC-ORBIS-P8-PAGE-WINDOW UI 操作の対象ページをウインドウ ID で確定する。 */
  private pageForWindow(entry: CuraEntry, window: BrowserWindow): CuraPage | undefined {
    return entry.pages.find((page) => page.window?.id === window.id)
  }

  private activePage(entry: CuraEntry): CuraPage | undefined {
    return entry.pages.find((page) => page.view.webContents.id === entry.activeViewId)
  }

  private fenestraState(entry: CuraEntry): { alwaysOnTop: boolean; opacity: number } {
    return { alwaysOnTop: entry.cura.alwaysOnTop, opacity: entry.cura.opacity }
  }

  private persistFenestra(entry: CuraEntry, alwaysOnTop: boolean, opacity: number): void {
    entry.cura = { ...entry.cura, alwaysOnTop, opacity }
    this.hooks.onCuraChanged(entry.cura)
    for (const tab of entry.pages) {
      if (!tab.window || tab.window.isDestroyed()) continue
      tab.window.setAlwaysOnTop(alwaysOnTop)
      tab.window.setOpacity(opacity)
      tab.window.webContents.send(channels.fenestraState, { alwaysOnTop, opacity })
    }
  }

  /** @implements SPEC-ORBIS-P0-CURA SPEC-ORBIS-VITRUM-APPLY */
  private createPage(
    entry: CuraEntry,
    value: string,
    fromPageId: string | null = null,
    navigationKind: NavigationKind = 'navigate',
    restoredPage?: Page,
    activate = true,
    forcedHabitusId?: HabitusId,
    umbra = false,
    reuseExisting = true
  ): CuraPage | undefined {
    let url: string
    try {
      url = normalizeNavigationUrl(value)
    } catch (error) {
      this.reportNavigationError(entry, error instanceof Error ? error.message : 'The URL is invalid.')
      return undefined
    }

    const habitusId = forcedHabitusId
      ?? this.habitusService.resolve(entry.cura, restoredPage?.id ?? randomUUID())
    if (navigationKind === 'explore' && (!isAllowedExplorationUrl(url) || !this.formaRegistry.allowsAutomation(url, habitusId))) {
      this.reportNavigationError(entry, 'This site does not allow automated exploration.')
      return undefined
    }
    const preset = this.habitusService.preset(habitusId)
    const view = new WebContentsView({
      webPreferences: {
        preload: join(__dirname, '../preload/page-bridge.js'),
        partition: preset.partition,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    const now = new Date().toISOString()
    const normalizedUrl = normalizeGraphUrl(url)
    const existingPage = reuseExisting ? this.pageRepository.findActiveByUrl(entry.cura.id, normalizedUrl) : undefined
    const page: Page = restoredPage
      ? { ...restoredPage, url, active: true, umbra }
      : existingPage
        ? { ...existingPage, lastVisit: now, umbra }
      : {
          id: randomUUID(),
          curaId: entry.cura.id,
      url: normalizedUrl,
          title: url,
          firstVisit: now,
          lastVisit: now,
          active: true,
          umbra
        }
    const tab: CuraPage = {
      page,
      view,
      hasCommittedNavigation: false,
      initialFromPageId: fromPageId,
      initialNavigationKind: navigationKind,
      habitusId,
      umbra,
      llmNavigationPending: false,
      viewKey: randomUUID()
    }
    entry.pages.push(tab)
    tab.disposeVitrum = this.vitrum.watch(view.webContents, () => tab.page.id, () => tab.habitusId)
    this.hooks.onPageCreated?.(entry.cura.id, tab.viewKey, view.webContents)
    if (preset.userAgent) view.webContents.setUserAgent(preset.userAgent)
    void applyEmulation(view.webContents, preset).catch((error: unknown) => console.error('Unable to apply initial Habitus emulation.', error))

    view.webContents.on('will-navigate', (details) => this.guardNavigation(entry, details, details.url, tab))
    view.webContents.on('will-redirect', (details) => this.guardNavigation(entry, details, details.url, tab))
    view.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
      const childKind = tab.initialNavigationKind === 'explore' ? 'explore' : navigationKindForNewView()
      if (childKind === 'explore') {
        // Automated pages must never become visible through window.open; only
        // an explicit reveal operation may attach an exploration view.
        this.createPage(entry, nextUrl, tab.page.id, childKind, undefined, false, undefined, true, false)
      } else {
        this.createPage(entry, nextUrl, tab.page.id, childKind)
      }
      return { action: 'deny' }
    })
    view.webContents.on('did-navigate', (_event, nextUrl) => this.commitNavigation(entry, tab, nextUrl))
    view.webContents.on('did-navigate-in-page', (_event, nextUrl) => this.commitNavigation(entry, tab, nextUrl))
    view.webContents.on('page-title-updated', (_event, title) => {
      const updatedPage = { ...tab.page, title }
      this.pageRepository.save(updatedPage)
      tab.page = updatedPage
      tab.window?.setTitle(title)
      this.updateGraph(entry, updatedPage, null, 'navigate')
      this.sendPages(entry)
      this.sendGraph(entry)
    })
    view.webContents.on('did-finish-load', () => {
      void injectForma(view.webContents, this.formaRegistry, tab.habitusId).catch((error: unknown) => console.error('Unable to apply Forma.', error))
    })

    if (!umbra) this.attachPageWindow(entry, tab)
    if (activate && !umbra) this.activatePage(entry, tab)
    else this.sendPages(entry)
    if (umbra) this.enforceUmbraCap(entry)
    void view.webContents.loadURL(normalizedUrl).catch(() => {
      this.reportNavigationError(entry, 'Unable to load this URL.')
    })
    return tab
  }

  /** @implements SPEC-ORBIS-P8-PAGE-WINDOW SPEC-ORBIS-VITRUM-APPLY Creates the control-bar host only when a page becomes visible. */
  private attachPageWindow(entry: CuraEntry, tab: CuraPage): void {
    if (tab.window && !tab.window.isDestroyed()) return
    let window: BrowserWindow
    window = this.pageWindows.create({
      ownerId: () => tab.page.id,
      title: tab.page.title,
      view: tab.view,
      alwaysOnTop: entry.cura.alwaysOnTop,
      opacity: entry.cura.opacity,
      onWebContentsCreated: (pageWindow, webContents) => this.hooks.onWebContentsCreated(pageWindow, webContents),
      onFocus: () => {
        this.activeCuraId = entry.cura.id
        entry.activeViewId = tab.view.webContents.id
        this.publishShellState(entry)
      },
      onClosed: (rendererFailed) => {
        if (tab.window !== window) return
        tab.window = undefined
        const wasActive = entry.activeViewId === tab.view.webContents.id
        if (!this.isQuitting && !rendererFailed) this.pageRepository.deactivate(tab.page.id)
        if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close()
        tab.disposeVitrum?.()
        entry.pages = entry.pages.filter((candidate) => candidate !== tab)
        this.hooks.onPageClosed?.(entry.cura.id, tab.viewKey)
        if (wasActive) {
          entry.activeViewId = null
          const next = [...entry.pages].reverse().find((candidate) => !candidate.umbra)
          if (next && !this.isQuitting) this.activatePage(entry, next)
        }
        if (!this.isQuitting) this.publishShellState(entry)
      },
      onRendererReady: (pageWindow) => this.publishState(pageWindow)
    })
    tab.window = window
  }

  private publishShellState(entry: CuraEntry): void {
    const state = this.graphStore.snapshot(entry.cura.id, this.activePage(entry)?.page.id ?? null)
    this.hooks.onGraphChanged?.(entry.cura.id, state)
  }

  /** @implements SPEC-ORBIS-P5-UMBRA SPEC-ORBIS-VITRUM-APPLY 上限超過の Umbra view を古い順に閉じる。page 行と Nexus ノードは残す。 */
  private enforceUmbraCap(entry: CuraEntry): void {
    const evicted = selectUmbraEvictions(entry.pages.filter((tab) => tab.umbra).map((tab) => ({ pageId: tab.page.id, lastVisit: tab.page.lastVisit })))
    if (evicted.length === 0) return
    for (const pageId of evicted) {
      const tab = entry.pages.find((candidate) => candidate.page.id === pageId)
      if (tab && !tab.view.webContents.isDestroyed()) tab.view.webContents.close()
      tab?.disposeVitrum?.()
      if (tab) this.hooks.onPageClosed?.(entry.cura.id, tab.viewKey)
      entry.pages = entry.pages.filter((candidate) => candidate.page.id !== pageId)
    }
  }

  /** @implements SPEC-ORBIS-P0-CURA SPEC-ORBIS-VITRUM-APPLY */
  private commitNavigation(entry: CuraEntry, tab: CuraPage, nextUrl: string): void {
    if (!isAllowedNavigationUrl(nextUrl)) return
    const now = new Date().toISOString()
    const normalizedUrl = normalizeGraphUrl(nextUrl)
    const followKind: NavigationKind = tab.initialNavigationKind === 'explore'
      ? 'explore'
      : tab.llmNavigationPending ? 'llm' : 'navigate'
    tab.llmNavigationPending = false

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
      this.sendGraph(entry)
      return
    }

    if (tab.page.url === normalizedUrl) {
      const reloadedPage = { ...tab.page, lastVisit: now }
      this.pageRepository.recordNavigation(entry.cura.id, null, reloadedPage)
      tab.page = reloadedPage
      this.updateGraph(entry, reloadedPage, null, 'navigate')
      this.sendPages(entry)
      this.sendGraph(entry)
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
      active: true,
      umbra: tab.umbra
    }
    const existingPage = this.pageRepository.findActiveByUrl(entry.cura.id, normalizedUrl)
    const resolvedPage = existingPage ? { ...existingPage, lastVisit: now, umbra: tab.umbra } : nextPage
    this.pageRepository.recordNavigation(entry.cura.id, previousPage.id, resolvedPage, followKind, !existingPage)
    tab.page = resolvedPage
    // Same-document navigations do not emit did-finish-load, so resolve the new page's filter here too.
    this.vitrum.apply(tab.view.webContents, tab.page.id, tab.habitusId)
    this.updateGraph(entry, resolvedPage, resolveNavigationParent(true, previousPage.id, null), followKind)
    this.sendPages(entry)
    this.sendGraph(entry)
  }

  private activatePage(entry: CuraEntry, page: CuraPage): void {
    entry.startParentPageId = null
    this.activeCuraId = entry.cura.id
    entry.activeViewId = page.view.webContents.id
    if (page.window?.isMinimized()) page.window.restore()
    page.window?.show()
    page.window?.focus()
    page.view.webContents.focus()
    this.sendPages(entry)
    this.sendGraph(entry)
  }

  private sendPages(entry: CuraEntry): void {
    const state = {
      pages: entry.pages.filter((tab) => !tab.umbra).map(({ page }) => ({ id: page.id, title: page.title, url: page.url })),
      activePageId: this.activePage(entry)?.page.id ?? null
    }
    for (const tab of entry.pages) {
      if (tab.window && !tab.window.webContents.isDestroyed()) {
        tab.window.webContents.send(channels.pages, { ...state, activePageId: tab.page.id })
      }
    }
    this.publishShellState(entry)
  }

  private sendGraph(entry: CuraEntry): void {
    const state = this.graphStore.snapshot(entry.cura.id, this.activePage(entry)?.page.id ?? null)
    this.publishShellState(entry)
    for (const tab of entry.pages) if (tab.window && !tab.window.webContents.isDestroyed()) tab.window.webContents.send(channels.graph, state)
  }

  private sendHabitus(entry: CuraEntry): void {
    for (const tab of entry.pages) if (tab.window && !tab.window.webContents.isDestroyed()) tab.window.webContents.send(channels.habitusState, { id: this.habitusService.getCuraDefault(entry.cura) })
  }

  private sendComparatio(entry: CuraEntry): void {
    for (const tab of entry.pages) if (tab.window && !tab.window.webContents.isDestroyed()) tab.window.webContents.send(channels.comparatio, { open: entry.comparatioOpen, products: this.comparatioService.list(entry.cura.id) })
  }

  /** @implements SPEC-ORBIS-P2-HABITUS SPEC-ORBIS-VITRUM-APPLY */
  private recreatePageForPartition(entry: CuraEntry, tab: CuraPage, habitusId: HabitusId): void {
    const wasActive = this.activePage(entry) === tab
    const previousWindow = tab.window
    previousWindow?.contentView.removeChildView(tab.view)
    tab.window = undefined
    previousWindow?.destroy()
    if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close()
    tab.disposeVitrum?.()
    this.hooks.onPageClosed?.(entry.cura.id, tab.viewKey)
    entry.pages = entry.pages.filter((candidate) => candidate !== tab)
    this.createPage(
      entry,
      tab.page.url,
      tab.initialFromPageId,
      tab.initialNavigationKind,
      tab.page,
      wasActive,
      habitusId,
      tab.umbra
    )
  }

  private applyPageHabitus(tab: CuraPage, preset: ReturnType<HabitusService['preset']>): void {
    if (preset.userAgent) tab.view.webContents.setUserAgent(preset.userAgent)
    else tab.view.webContents.setUserAgent('')
    void applyEmulation(tab.view.webContents, preset).then(() => tab.view.webContents.reload()).catch((error: unknown) => console.error('Unable to apply Habitus emulation.', error))
  }

  private updateGraph(entry: CuraEntry, page: Page, fromPageId: string | null, kind: NavigationKind): void {
    this.graphStore.addNode(entry.cura.id, { id: page.id, url: page.url, title: page.title, lastVisit: page.lastVisit, umbra: page.umbra })
    if (!fromPageId) return
    this.graphStore.addEdge(entry.cura.id, { from: fromPageId, to: page.id, kind, count: 1, lastAt: page.lastVisit })
  }

  private reportNavigationError(entry: CuraEntry, message: string): void {
    for (const tab of entry.pages) if (tab.window && !tab.window.webContents.isDestroyed()) tab.window.webContents.send(channels.navigationError, message)
  }

  private guardNavigation(entry: CuraEntry, event: Electron.Event, nextUrl: string, tab?: CuraPage): void {
    if (isAllowedNavigationUrl(nextUrl) && (tab?.initialNavigationKind !== 'explore' || (isAllowedExplorationUrl(nextUrl) && this.formaRegistry.allowsAutomation(nextUrl, tab.habitusId)))) return
    event.preventDefault()
    this.reportNavigationError(entry, tab?.initialNavigationKind === 'explore'
      ? 'This destination is not allowed for automated exploration.'
      : 'Only HTTP and HTTPS URLs without credentials are supported.')
  }

}
