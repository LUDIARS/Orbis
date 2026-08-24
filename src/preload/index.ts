import { contextBridge, ipcRenderer } from 'electron'
import {
  channels,
  type OrbisBridge,
  type RendererEventMap,
  type RendererEventName
} from '../shared/ipc-contract.js'

const rendererEvents = new Set<RendererEventName>([
  channels.pages,
  channels.navigationError,
  channels.fenestraState,
  channels.graph,
  channels.searchResult,
  channels.habitusState,
  channels.comparatio,
  channels.gestureOverlay,
  channels.rotaSnapshot
])

/** @implements SPEC-ORBIS-P0-IPC */
const bridge: OrbisBridge = {
  navigate: (url) => ipcRenderer.send(channels.navigate, url),
  action: (id) => ipcRenderer.send(channels.action, id),
  selectPage: (id) => ipcRenderer.send(channels.selectPage, id),
  search: (query) => ipcRenderer.send(channels.search, query),
  setGraphLayout: (layout) => ipcRenderer.send(channels.graphLayout, layout),
  setGraphPaneCollapsed: (collapsed) => ipcRenderer.send(channels.graphPane, collapsed),
  setHabitus: (id) => ipcRenderer.send(channels.action, `habitus.set:${id}`),
  toggleComparatio: () => ipcRenderer.send(channels.comparatioToggle),
  gesture: (points, complete) => ipcRenderer.send(channels.gesture, points, complete),
  bindings: (scope) => ipcRenderer.invoke(channels.bindings, scope),
  saveBinding: (binding) => ipcRenderer.invoke(channels.bindingSave, binding),
  resetBindings: (scope) => ipcRenderer.invoke(channels.bindingReset, scope),
  setSettingsPaneOpen: (open) => ipcRenderer.send(channels.settingsPane, open),
  rotaSelectCura: (curaId) => ipcRenderer.send(channels.rotaSelectCura, curaId),
  rotaSelectPage: (curaId, pageId) => ipcRenderer.send(channels.rotaSelectPage, curaId, pageId),
  rotaSearch: (query) => ipcRenderer.send(channels.rotaSearch, query),
  rotaClose: () => ipcRenderer.send(channels.rotaClose),
  rotaReady: () => ipcRenderer.send(channels.rotaReady),
  ready: () => ipcRenderer.send(channels.ready),
  on: <K extends RendererEventName>(channel: K, listener: (value: RendererEventMap[K]) => void): (() => void) => {
    if (!rendererEvents.has(channel)) throw new TypeError(`Unsupported renderer event: ${channel}`)
    const wrapped = (_event: Electron.IpcRendererEvent, value: RendererEventMap[K]): void => listener(value)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
}

contextBridge.exposeInMainWorld('orbis', bridge)

let uiTrail: { x: number; y: number; at: number }[] | null = null
window.addEventListener('mousedown', (event) => { if (event.button === 2) uiTrail = [{ x: event.clientX, y: event.clientY, at: event.timeStamp }] })
window.addEventListener('pointermove', (event) => { if (uiTrail) { if (uiTrail.length < 256) uiTrail.push({ x: event.clientX, y: event.clientY, at: event.timeStamp }); bridge.gesture(uiTrail, false) } })
window.addEventListener('mouseup', (event) => { if (event.button === 2 && uiTrail) { bridge.gesture(uiTrail, true); uiTrail = null } })
window.addEventListener('blur', () => { uiTrail = null })
