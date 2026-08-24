import { app, BrowserWindow, session } from 'electron'
import { executeAction } from '../actions/registry.js'
import type { ActionId } from '../actions/types.js'
import { registerGlobalShortcuts, unregisterGlobalShortcuts } from '../clavis/global-shortcuts.js'
import { registerLocalShortcuts } from '../clavis/local-shortcuts.js'
import { CuraService } from '../cura/service.js'
import { CuraWindowFactory } from '../cura/window-factory.js'
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

/** @implements SPEC-ORBIS-P0-RADIX */
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
  const pageRepository = new PageRepository(db)
  const habitusService = new HabitusService(db)
  const comparatioService = new ComparatioService(db)
  const graphStore = new GraphStore()
  const service = new CuraService(new CuraRepository(db))
  let factory: CuraWindowFactory
  const run = (id: ActionId, window: BrowserWindow): void => {
    void Promise.resolve()
      .then(() => executeAction(id, { window, cura: factory }))
      .catch((error: unknown) => console.error('Action failed.', error))
  }
  function createCura(): BrowserWindow {
    return factory.create(service.create())
  }
  factory = new CuraWindowFactory(pageRepository, {
    onNewCura: () => createCura(),
    onCuraChanged: (cura) => service.update(cura),
    onWebContentsCreated: (window, webContents) => {
      registerLocalShortcuts(webContents, (id) => run(id, window))
    }
  }, graphStore, habitusService, comparatioService, new FormaRegistry([amazonForma]))

  const resolveWindow = (senderId: number): BrowserWindow | undefined => factory.resolveUiWindow(senderId)
  const disposeIpc = [
    registerActionHandler(resolveWindow, run),
    registerNavigateHandler(resolveWindow, (window, url) => factory.navigate(window, url)),
    registerSelectPageHandler(resolveWindow, (window, pageId) => factory.selectPage(window, pageId)),
    registerReadyHandler(resolveWindow, (window) => factory.publishState(window)),
    registerSearchHandler(resolveWindow, (window, query) => factory.search(window, query)),
    registerGraphPaneHandler(resolveWindow, (window, collapsed, layout) => factory.setGraphPane(window, collapsed, layout)),
    registerPageContentHandler((senderId, content) => factory.savePageContent(senderId, content)),
    registerProductFactsHandler((senderId, facts) => factory.saveProductFacts(senderId, facts)),
    registerComparatioHandler((senderId) => { const window = resolveWindow(senderId); if (window) factory.toggleComparatio(window) })
  ]
  app.once('will-quit', () => {
    unregisterGlobalShortcuts()
    for (const dispose of disposeIpc) dispose()
    for (const dispose of disposeSessionPermissions) dispose()
    db.close()
  })

  const restored = service.list()
  if (restored.length === 0) createCura()
  for (const cura of restored) factory.create(cura, pageRepository.listByCura(cura.id))

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createCura()
  })
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  registerGlobalShortcuts((id) => {
    const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
    if (window) run(id, window)
  })
}
