import { ipcRenderer } from 'electron'
import './forma-host.js'

/** @implements SPEC-ORBIS-P1-INDAGATIO */
export function reportPageText(): void {
  window.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('orbis:page-content', document.body?.innerText.slice(0, 2048) ?? '')
  }, { once: true })
}

reportPageText()

let trail: { x: number; y: number; at: number }[] | null = null
let recognized = false
window.addEventListener('mousedown', (event) => { if (event.button === 2) trail = [{ x: event.clientX, y: event.clientY, at: event.timeStamp }] })
window.addEventListener('pointermove', (event) => { if (trail) { if (trail.length < 256) trail.push({ x: event.clientX, y: event.clientY, at: event.timeStamp }); ipcRenderer.send('orbis:gesture', trail, false) } })
window.addEventListener('mouseup', (event) => { if (event.button === 2 && trail) { ipcRenderer.send('orbis:gesture', trail, true); const first = trail[0]; const last = trail.at(-1)!; recognized = last.at - first.at <= 1500 && trail.some((point) => Math.hypot(point.x - first.x, point.y - first.y) >= 24); trail = null } })
window.addEventListener('contextmenu', (event) => { if (recognized) { event.preventDefault(); recognized = false } })
window.addEventListener('blur', () => { trail = null; recognized = false })
