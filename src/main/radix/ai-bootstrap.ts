import { app, session } from 'electron'
import { mkdirSync } from 'node:fs'
import { rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { AiModeConfig } from './ai-mode-config.js'
import { openDatabase } from '../tabularium/db.js'
import { SigillumService } from '../sigillum/service.js'
import { AuditLog } from '../vinculum/audit.js'
import { VinculumAccessLog } from '../vinculum/access-log.js'
import { VinculumServer } from '../vinculum/server.js'
import { AiNetworkProxy } from '../vinculum/ai-network-proxy.js'
import { AiVinculumOperations } from '../vinculum/ai-operations.js'
import { restrictAiSession } from '../habitus/ai-session.js'

/** @implements SPEC-ORBIS-AI-ONLY Separate lifecycle: never import/initialize human UI state. */
export async function bootstrapAiMode(config: AiModeConfig): Promise<void> {
  for (const flag of ['remote-debugging-port', 'remote-debugging-pipe', 'no-sandbox', 'disable-web-security', 'ignore-certificate-errors']) {
    if (app.commandLine.hasSwitch(flag)) throw new Error('AI mode refuses unsafe Chromium startup switches.')
  }
  mkdirSync(config.profile, { recursive: true })
  app.setPath('userData', config.profile)
  app.setPath('sessionData', config.profile)
  app.commandLine.appendSwitch('disable-quic')
  app.commandLine.appendSwitch('force-webrtc-ip-handling-policy', 'disable_non_proxied_udp')
  if (!app.requestSingleInstanceLock()) { app.quit(); return }
  // No activation/second-instance handler may show a window or process a supplied URL.
  app.on('window-all-closed', () => { /* The headless control server owns application lifetime. */ })
  app.on('select-client-certificate', (event, _contents, _url, _certificates, callback) => {
    event.preventDefault()
    callback() // Never reuse a human's OS client certificate or present a chooser.
  })
  app.on('login', (event, _contents, _details, _auth, callback) => {
    event.preventDefault()
    callback() // AI test accounts authenticate through the page, not native dialogs.
  })
  await app.whenReady()
  app.dock?.hide()

  const db = openDatabase()
  const seals = new SigillumService(db)
  const curaId = randomUUID()
  let browserSigillum: string
  try {
    seals.revokeAll()
    browserSigillum = seals.issue('browser', curaId, null)
  } catch (error) { db.close(); throw error }
  const proxy = new AiNetworkProxy(config.origins)
  const target = session.fromPartition('persist:orbis-ai-only')
  const operations = new AiVinculumOperations(seals, curaId, target, config.origins)
  const server = new VinculumServer(config.token, seals, new AuditLog(db), operations,
    new VinculumAccessLog(db), () => true, { baseUrl: config.excubitorUrl }, { browserSigillum })
  const disposeSessions: (() => void)[] = []
  let cleanup: Promise<void> | undefined
  const stop = (): Promise<void> => {
    cleanup ??= (async () => {
      operations.dispose()
      try { await server.stop() }
      finally {
        try {
          try { await Promise.all([target.closeAllConnections(), session.defaultSession.closeAllConnections()]) }
          finally { await proxy.stop() }
        }
        finally {
          try {
            for (const dispose of disposeSessions) dispose()
            seals.revokeAll()
          } finally {
            db.close()
            await rm(join(config.profile, 'vinculum.json'), { force: true })
          }
        }
      }
    })()
    return cleanup
  }
  let quitting = false
  const beforeQuit = (event: Electron.Event): void => {
    if (quitting) return
    event.preventDefault()
    quitting = true
    void stop().then(() => app.quit(), () => app.exit(1))
  }
  app.on('before-quit', beforeQuit)
  try {
    // Remove stale discovery before starting; credentials never enter this file.
    await rm(join(config.profile, 'vinculum.json'), { force: true })
    const proxyPort = await proxy.start()
    for (const scopedSession of [target, session.defaultSession]) {
      disposeSessions.push(await restrictAiSession(scopedSession, config.origins, proxyPort))
    }
    await server.start(config.profile)
  } catch (error) {
    app.removeListener('before-quit', beforeQuit)
    await stop()
    throw error
  }
}
