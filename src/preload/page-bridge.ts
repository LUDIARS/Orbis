import { ipcRenderer } from 'electron'
import './forma-host.js'

/** @implements SPEC-ORBIS-P1-INDAGATIO */
export function reportPageText(): void {
  window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('orbis:page-content', document.body?.innerText.slice(0, 2048) ?? '')
  }, { once: true })
}

reportPageText()
