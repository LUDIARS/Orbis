import type { WebContents } from 'electron'
import type { AuditLog } from './audit.js'

const staticAsset = /\.(?:css|js|map|png|jpe?g|gif|svg|ico|woff2?)(?:$|[?#])/i

/** @implements SPEC-ORBIS-P6-AUDIT Store only deduplicated console and navigation summaries, never payload bodies. */
export function auditPageEvents(webContents: WebContents, sigillum: string, audit: AuditLog): void {
  let previousConsole = ''
  let previousUrl = ''
  const record = (kind: 'console' | 'network', payload: unknown): void => {
    try { audit.record(sigillum, 'page', kind, payload) } catch { console.error('Unable to record a page audit event.') }
  }
  webContents.on('console-message', (_event, level, message) => {
    const line = String(message).split(/\r?\n/, 1)[0].slice(0, 512)
    const key = `${level}:${line}`
    if (!line || key === previousConsole) return
    previousConsole = key
    record('console', { level, line })
  })
  webContents.on('did-navigate', (_event, url, httpResponseCode) => {
    if (url === previousUrl || staticAsset.test(url)) return
    previousUrl = url
    record('network', { status: httpResponseCode, url, ms: 0 })
  })
  webContents.on('did-fail-load', (_event, code, description, url) => {
    if (url === previousUrl || staticAsset.test(url)) return
    previousUrl = url
    record('network', { status: code, url, ms: 0, error: String(description).slice(0, 160) })
  })
}
