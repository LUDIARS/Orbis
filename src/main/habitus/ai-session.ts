import type { Session } from 'electron'
import type { AiOriginPolicy } from '../vinculum/ai-origin-policy.js'
import { denySessionPermissions } from './session-permissions.js'

/** @implements SPEC-ORBIS-AI-ONLY Installed before the first renderer is created. */
export async function restrictAiSession(target: Session, policy: AiOriginPolicy, proxyPort: number): Promise<() => void> {
  // Explicitly remove Chromium's implicit localhost proxy bypass; never add DIRECT.
  await target.setProxy({ mode: 'fixed_servers', proxyRules: `http://127.0.0.1:${proxyPort}`, proxyBypassRules: '<-loopback>' })
  const disposePermissions = denySessionPermissions(target)
  target.setDevicePermissionHandler(() => false)
  target.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !policy.allows(details.url) }))
  target.webRequest.onHeadersReceived((details, callback) => {
    const headers = { ...details.responseHeaders }
    const cspKey = Object.keys(headers).find((name) => name.toLowerCase() === 'content-security-policy') ?? 'Content-Security-Policy'
    // An additional response policy cannot be removed by page JavaScript. Omitting
    // allow-modals disables window.print too, which disableDialogs alone does not.
    headers[cspKey] = [...(headers[cspKey] ?? []), 'sandbox allow-scripts allow-same-origin allow-forms']
    callback({ responseHeaders: headers })
  })
  const preventDownload = (event: Electron.Event): void => event.preventDefault()
  target.on('will-download', preventDownload)
  return () => {
    // Call only after renderers/connections are closed; removing guards earlier creates a bypass.
    target.webRequest.onBeforeRequest(null)
    target.webRequest.onHeadersReceived(null)
    target.removeListener('will-download', preventDownload)
    target.setDevicePermissionHandler(null)
    disposePermissions()
  }
}
