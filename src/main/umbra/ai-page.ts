import { BrowserWindow, type Session } from 'electron'
import type { AiOriginPolicy } from '../vinculum/ai-origin-policy.js'

/** @implements SPEC-ORBIS-AI-ONLY Offscreen rendering without the human shell or preload. */
export async function createAiPage(target: Session, policy: AiOriginPolicy): Promise<BrowserWindow> {
  const window = new BrowserWindow({
    width: 1280, height: 900, show: false, focusable: false, skipTaskbar: true,
    webPreferences: {
      session: target, offscreen: true, sandbox: true, contextIsolation: true,
      nodeIntegration: false, nodeIntegrationInWorker: false, webviewTag: false,
      devTools: false, disableDialogs: true, safeDialogs: true, navigateOnDragDrop: false,
      backgroundThrottling: false, webSecurity: true, allowRunningInsecureContent: false
    }
  })
  window.setMenu(null)
  window.setIgnoreMouseEvents(true)
  window.setEnabled(false)
  window.on('show', () => window.hide())
  const contents = window.webContents
  contents.setWebRTCIPHandlingPolicy('disable_non_proxied_udp')
  contents.setWindowOpenHandler(() => ({ action: 'deny' }))
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.on('will-navigate', (event, url) => { if (!policy.allows(url)) event.preventDefault() })
  contents.on('will-frame-navigate', (event) => { if (!policy.allows(event.url)) event.preventDefault() })
  contents.on('will-redirect', (event, url) => { if (!policy.allows(url)) event.preventDefault() })
  contents.on('before-input-event', (event) => event.preventDefault())
  contents.on('select-bluetooth-device', (event, _devices, callback) => { event.preventDefault(); callback('') })
  try {
    // File inputs must not open a native picker. Keep this debugger session for the
    // lifetime of the page; the shared CDP operations preserve existing attachments.
    contents.debugger.attach('1.3')
    await contents.debugger.sendCommand('Page.setInterceptFileChooserDialog', { enabled: true })
    return window
  } catch (error) {
    window.destroy()
    throw error
  }
}
