import { ipcMain, type BrowserWindow, type IpcMainEvent } from 'electron'
import { channels, type GesturePoint } from '../../../shared/ipc-contract.js'

const MAX_COORDINATE = 1_000_000

/** @implements SPEC-ORBIS-P3-GESTUS */
const isPoint = (value: unknown): value is GesturePoint => {
  if (typeof value !== 'object' || value === null) return false
  const point = value as GesturePoint
  return Number.isFinite(point.x) && Math.abs(point.x) <= MAX_COORDINATE
    && Number.isFinite(point.y) && Math.abs(point.y) <= MAX_COORDINATE
    && Number.isFinite(point.at) && point.at >= 0
}

/** @implements SPEC-ORBIS-P3-GESTUS */
const hasOrderedTimestamps = (points: GesturePoint[]): boolean => points.every((point, index) => index === 0 || point.at >= points[index - 1].at)

/** @implements SPEC-ORBIS-P3-GESTUS */
export function registerGestureHandler(resolveWindow: (senderId: number) => BrowserWindow | undefined, update: (window: BrowserWindow, points: GesturePoint[], complete: boolean) => boolean): () => void {
  /** @implements SPEC-ORBIS-P3-GESTUS */
  const listener = (event: IpcMainEvent, value: unknown, complete: unknown): void => {
    if (!Array.isArray(value) || value.length > 256 || typeof complete !== 'boolean' || !value.every(isPoint) || !hasOrderedTimestamps(value)) return
    const window = resolveWindow(event.sender.id)
    if (window) update(window, value, complete)
  }
  ipcMain.on(channels.gesture, listener)
  return () => ipcMain.removeListener(channels.gesture, listener)
}
