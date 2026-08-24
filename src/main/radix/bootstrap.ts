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

  session.defaultSession.setPermissionCheckHandler(() => false)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false))

  const db = openDatabase()
  const pageRepository = new PageRepository(db)
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
  }, graphStore)

  const resolveWindow = (senderId: number): BrowserWindow | undefined => factory.resolveUiWindow(senderId)
  const disposeIpc = [
    registerActionHandler(resolveWindow, run),
    registerNavigateHandler(resolveWindow, (window, url) => factory.navigate(window, url)),
    registerSelectPageHandler(resolveWindow, (window, pageId) => factory.selectPage(window, pageId)),
    registerReadyHandler(resolveWindow, (window) => factory.publishState(window)),
    registerSearchHandler(resolveWindow, (window, query) => factory.search(window, query)),
    registerGraphPaneHandler(resolveWindow, (window, collapsed, layout) => factory.setGraphPane(window, collapsed, layout)),
    registerPageContentHandler((senderId, content) => factory.savePageContent(senderId, content))
  ]
  app.once('will-quit', () => {
    unregisterGlobalShortcuts()
    for (const dispose of disposeIpc) dispose()
    session.defaultSession.setPermissionCheckHandler(null)
    session.defaultSession.setPermissionRequestHandler(null)
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
