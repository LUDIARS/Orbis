import { app, BrowserWindow, session } from 'electron'
import { join } from 'node:path'
import { executeAction } from '../actions/registry.js'
import type { ActionId } from '../actions/types.js'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from '../clavis/global-shortcuts.js'
import { registerLocalShortcuts } from '../clavis/local-shortcuts.js'
import { CuraService } from '../cura/service.js'
import { CuraWindowFactory } from '../cura/window-factory.js'
import { normalizeDevelopmentRendererUrl } from '../cura/navigation-url.js'
import { registerActionHandler } from '../ipc/handlers/register-action-handler.js'
import { registerNavigateHandler } from '../ipc/handlers/register-navigate-handler.js'
import { registerReadyHandler } from '../ipc/handlers/register-ready-handler.js'
import { registerSelectPageHandler } from '../ipc/handlers/register-select-page-handler.js'
import { registerSearchHandler } from '../ipc/handlers/register-search-handler.js'
import { registerGraphPaneHandler } from '../ipc/handlers/register-graph-pane-handler.js'
import { registerPageContentHandler } from '../ipc/handlers/register-page-content-handler.js'
import { GraphStore } from '../nexus/graph-store.js'
import { openDatabase } from '../tabularium/db.js'
import { CuraRepository } from '../tabularium/repositories/cura-repo.js'
import { PageRepository } from '../tabularium/repositories/page-repo.js'
import { HabitusService } from '../habitus/service.js'
import { ComparatioService } from '../comparatio/service.js'
import { FormaRegistry } from '../forma/registry.js'
import { amazonForma } from '../forma/sites/amazon/index.js'
import { registerProductFactsHandler } from '../ipc/handlers/register-product-facts-handler.js'
import { registerComparatioHandler } from '../ipc/handlers/register-comparatio-handler.js'
import { habitusPresets } from '../habitus/presets/index.js'
import { denySessionPermissions } from '../habitus/session-permissions.js'
import { BindingStore } from '../clavis/binding-store.js'
import { GestusService } from '../gestus/service.js'
import { registerGestureHandler } from '../ipc/handlers/register-gesture-handler.js'
import { registerBindingHandler } from '../ipc/handlers/register-binding-handler.js'
import { registerSettingsPaneHandler } from '../ipc/handlers/register-settings-pane-handler.js'
import { registerRotaHandler } from '../ipc/handlers/register-rota-handler.js'
import { RotaOverlayWindow } from '../rota/overlay-window.js'
import { SigillumService } from '../sigillum/service.js'
import { AuditLog } from '../vinculum/audit.js'
import { createOrLoadToken } from '../vinculum/auth.js'
import { OrbisVinculumOperations } from '../vinculum/orbis-operations.js'
import { VinculumServer } from '../vinculum/server.js'
import { registerSigillumHandler } from '../ipc/handlers/register-sigillum-handler.js'
import { selectRotaCura, selectRotaPage } from '../rota/actions.js'
import { buildRotaSnapshot } from '../rota/snapshot.js'
import { filterRotaSnapshot } from '../rota/search.js'

/** @implements SPEC-ORBIS-P0-RADIX SPEC-ORBIS-P3-CLAVIS SPEC-ORBIS-P3-GESTUS SPEC-ORBIS-P3-SETTINGS SPEC-ORBIS-P4-ROTA SPEC-ORBIS-P4-OVERLAY */
export async function bootstrap(): Promise<void> {
  if (!app.requestSingleInstanceLock()) {
    app.quit()
    return
  }

  app.on('second-instance', () => {
    const window = BrowserWindow.getAllWindows()[0]
    if (!window) return
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  })
  await app.whenReady()

  const restrictedSessions = new Set([
    session.defaultSession,
    ...Object.values(habitusPresets).map((preset) => session.fromPartition(preset.partition))
  ])
  const disposeSessionPermissions = [...restrictedSessions].map(denySessionPermissions)

  const db = openDatabase()
  const bindingStore = new BindingStore(db)
  const pageRepository = new PageRepository(db)
  const curaRepository = new CuraRepository(db)
  const habitusService = new HabitusService(db)
  const comparatioService = new ComparatioService(db)
  const graphStore = new GraphStore()
  const service = new CuraService(curaRepository)
  let factory: CuraWindowFactory
  const rotaOverlay = new RotaOverlayWindow({
    loadUrl: process.env.ELECTRON_RENDERER_URL
      ? new URL('rota.html', normalizeDevelopmentRendererUrl(process.env.ELECTRON_RENDERER_URL)).toString()
      : null,
    preloadPath: join(__dirname, '../preload/index.js')
  })
  const rota = {
    open: (): void => rotaOverlay.open(buildRotaSnapshot(curaRepository, pageRepository, graphStore))
  }
  const run = (id: ActionId, window: BrowserWindow): void => {
    void Promise.resolve()
      .then(() => executeAction(id, { window, cura: factory, rota }))
      .catch((error: unknown) => console.error('Action failed.', error))
  }
  const sigillumService = new SigillumService(db)
  sigillumService.revokeAll()
  const auditLog = new AuditLog(db)
  /** browserSigillum は起動ごとに再発行 (§7.2)。 */
  const browserSigilla = new Map<string, string>()
  const issueBrowserSigillum = (curaId: string): void => {
    sigillumService.revokeBrowserSigilla(curaId)
    browserSigilla.set(curaId, sigillumService.issue('browser', curaId, null))
  }
  function createCura(): BrowserWindow {
    const cura = service.create()
    issueBrowserSigillum(cura.id)
    return factory.create(cura)
  }
  factory = new CuraWindowFactory(pageRepository, {
    onNewCura: () => createCura(),
    onCuraChanged: (cura) => service.update(cura),
    onWebContentsCreated: (window, webContents) => {
      registerLocalShortcuts(webContents, (id) => run(id, window), () => bindingStore.keyBindings())
    },
    onCuraClosed: (curaId) => {
      sigillumService.revokeBrowserSigilla(curaId)
      browserSigilla.delete(curaId)
    },
    onRevealUmbra: (curaId, pageId) => auditLog.record(sigillumService.forPage(curaId, pageId), 'user', 'reveal', { pageId }),
    onPageClosed: (curaId, pageId) => sigillumService.revokePage(curaId, pageId)
  }, graphStore, habitusService, comparatioService, new FormaRegistry([amazonForma]))

  const resolveWindow = (senderId: number): BrowserWindow | undefined => factory.resolveUiWindow(senderId)
  const resolveAnyWindow = (senderId: number): BrowserWindow | undefined => factory.resolveWindow(senderId)
  const registerBindings = (): void => registerGlobalShortcuts((id) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (window) run(id, window)
  }, bindingStore.keyBindings())
  const gestus = new GestusService(bindingStore, run)
  const disposeIpc = [
    registerActionHandler(resolveWindow, run),
    registerNavigateHandler(resolveWindow, (window, url) => factory.navigate(window, url)),
    registerSelectPageHandler(resolveWindow, (window, pageId) => factory.selectPage(window, pageId)),
    registerReadyHandler(resolveWindow, (window) => factory.publishState(window)),
    registerSearchHandler(resolveWindow, (window, query) => factory.search(window, query)),
    registerGraphPaneHandler(resolveWindow, (window, collapsed, layout) => factory.setGraphPane(window, collapsed, layout)),
    registerPageContentHandler((senderId, content) => factory.savePageContent(senderId, content)),
    registerProductFactsHandler((senderId, facts) => factory.saveProductFacts(senderId, facts)),
    registerComparatioHandler((senderId) => { const window = resolveWindow(senderId); if (window) factory.toggleComparatio(window) }),
    registerGestureHandler(resolveAnyWindow, (window, points, complete) => gestus.update(window, points, complete)),
    registerBindingHandler(resolveWindow, bindingStore, registerBindings),
    registerSettingsPaneHandler(resolveWindow, (window, open) => factory.setSettingsPaneOpen(window, open)),
    registerRotaHandler({
      isOverlay: (senderId) => rotaOverlay.isOverlay(senderId),
      selectCura: (curaId) => selectRotaCura(curaId, curaRepository, pageRepository, factory),
      selectPage: (curaId, pageId) => {
        selectRotaPage(curaId, pageId, curaRepository, pageRepository, factory)
        rotaOverlay.close()
      },
      search: (query) => rotaOverlay.update(filterRotaSnapshot(
        pageRepository,
        buildRotaSnapshot(curaRepository, pageRepository, graphStore),
        query
      )),
      close: () => rotaOverlay.close(),
      ready: () => rotaOverlay.rendererReady()
    }),
    registerSigillumHandler(resolveWindow, (window) => {
      const info = factory.activePageInfo(window)
      if (!info) return { browser: null, page: null }
      return {
        browser: browserSigilla.get(info.curaId) ?? null,
        page: sigillumService.forPage(info.curaId, info.pageId)
      }
    })
  ]
  app.once('before-quit', () => rotaOverlay.destroy())
  app.once('will-quit', () => {
    void vinculum.stop().catch(() => undefined)
    unregisterGlobalShortcuts()
    for (const dispose of disposeIpc) dispose()
    for (const dispose of disposeSessionPermissions) dispose()
    db.close()
  })

  const restored = service.list()
  if (restored.length === 0) createCura()
  for (const cura of restored) {
    issueBrowserSigillum(cura.id)
    factory.create(cura, pageRepository.listByCura(cura.id))
  }

  /** @implements SPEC-ORBIS-P5-VINCULUM Cc 専用の loopback MCP ブリッジ。ポートは OS 採番し vinculum.json に書く。 */
  const vinculum = new VinculumServer(
    createOrLoadToken(db),
    sigillumService,
    auditLog,
    new OrbisVinculumOperations(sigillumService, factory, pageRepository)
  )
  void vinculum.start(app.getPath('userData'))
    .then((port) => console.log(`Vinculum is listening on 127.0.0.1:${port}`))
    .catch((error: unknown) => console.error('Unable to start Vinculum.', error))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createCura()
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  registerBindings()
}
