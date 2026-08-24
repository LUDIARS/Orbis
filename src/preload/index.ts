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
  channels.fenestraState
  , channels.graph
  , channels.searchResult
  , channels.habitusState
  , channels.comparatio
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
  ready: () => ipcRenderer.send(channels.ready),
  on: <K extends RendererEventName>(channel: K, listener: (value: RendererEventMap[K]) => void): (() => void) => {
    if (!rendererEvents.has(channel)) throw new TypeError(`Unsupported renderer event: ${channel}`)
    const wrapped = (_event: Electron.IpcRendererEvent, value: RendererEventMap[K]): void => listener(value)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  }
}

contextBridge.exposeInMainWorld('orbis', bridge)
