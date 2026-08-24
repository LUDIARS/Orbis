import type { BrowserWindow } from 'electron'
import type { ActionId } from '../actions/types.js'
import type { BindingStore } from '../clavis/binding-store.js'
import { channels, type GestureOverlayState } from '../../shared/ipc-contract.js'
import { resolveGesture } from './bindings.js'
import { recognizeGesture, type Point } from './recognizer.js'

/** @implements SPEC-ORBIS-P3-GESTUS */
export class GestusService {
  /** @implements SPEC-ORBIS-P3-GESTUS */
  constructor(private readonly store: BindingStore, private readonly execute: (id: ActionId, window: BrowserWindow) => void) {}

  /** @implements SPEC-ORBIS-P3-GESTUS */
  update(window: BrowserWindow, points: Point[], complete: boolean): boolean {
    const stroke = recognizeGesture(points)
    const actionId = stroke ? resolveGesture(stroke, this.store) : undefined
    this.publish(window, { points, stroke, actionName: actionId ?? null, active: !complete })
    if (!complete || !actionId) return false
    this.execute(actionId, window)
    return true
  }

  /** @implements SPEC-ORBIS-P3-OVERLAY */
  private publish(window: BrowserWindow, state: GestureOverlayState): void {
    window.webContents.send(channels.gestureOverlay, state)
  }
}
