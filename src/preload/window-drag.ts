import { WINDOW_DRAG_THRESHOLD_PX, type WindowDragInput } from '../shared/ipc-contract.js'

const INTERACTIVE_SELECTOR = [
  'a', 'button', 'input', 'select', 'textarea', 'summary', 'label',
  'img', 'video', 'audio', 'canvas', 'svg',
  '[role]', '[tabindex]', '[contenteditable]', '[draggable="true"]', '[onclick]'
].join(',')

interface DragCandidate {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastY: number
  dragging: boolean
}

/** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
function isEmptyPageSurface(target: EventTarget | null): target is Element {
  if (!(target instanceof Element) || target.closest(INTERACTIVE_SELECTOR)) return false
  const style = getComputedStyle(target)
  if (style.cursor !== 'auto' && style.cursor !== 'default') return false
  if (target === document.body || target === document.documentElement) return true
  return target.childElementCount === 0 && (target.textContent?.trim() ?? '') === ''
}

/**
 * External page content cannot invoke privileged IPC directly. The isolated
 * preload promotes only a blank-surface pointer movement into a window drag.
 * @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG
 */
export function installPageWindowDragging(send: (input: WindowDragInput) => void): () => void {
  let candidate: DragCandidate | null = null

  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  const finish = (event?: PointerEvent): void => {
    if (candidate?.dragging) {
      send({
        phase: 'end',
        screenX: event?.screenX ?? candidate.lastX,
        screenY: event?.screenY ?? candidate.lastY
      })
    }
    candidate = null
  }
  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  const onPointerDown = (event: PointerEvent): void => {
    if (!event.isTrusted || event.button !== 0 || !event.isPrimary || !isEmptyPageSurface(event.target)) return
    candidate = {
      pointerId: event.pointerId,
      startX: event.screenX,
      startY: event.screenY,
      lastX: event.screenX,
      lastY: event.screenY,
      dragging: false
    }
  }
  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  const onPointerMove = (event: PointerEvent): void => {
    if (!event.isTrusted || !candidate || event.pointerId !== candidate.pointerId) return
    candidate.lastX = event.screenX
    candidate.lastY = event.screenY
    if (!candidate.dragging) {
      const distance = Math.hypot(event.screenX - candidate.startX, event.screenY - candidate.startY)
      if (distance < WINDOW_DRAG_THRESHOLD_PX) return
      candidate.dragging = true
      send({ phase: 'begin', screenX: candidate.startX, screenY: candidate.startY })
    }
    event.preventDefault()
    event.stopImmediatePropagation()
    send({ phase: 'move', screenX: event.screenX, screenY: event.screenY })
  }
  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  const onPointerUp = (event: PointerEvent): void => {
    if (!event.isTrusted || !candidate || event.pointerId !== candidate.pointerId) return
    if (candidate.dragging) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    finish(event)
  }
  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  const onBlur = (): void => finish()

  window.addEventListener('pointerdown', onPointerDown, true)
  window.addEventListener('pointermove', onPointerMove, true)
  window.addEventListener('pointerup', onPointerUp, true)
  window.addEventListener('pointercancel', onPointerUp, true)
  window.addEventListener('blur', onBlur)
  /** @implements SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG */
  return () => {
    finish()
    window.removeEventListener('pointerdown', onPointerDown, true)
    window.removeEventListener('pointermove', onPointerMove, true)
    window.removeEventListener('pointerup', onPointerUp, true)
    window.removeEventListener('pointercancel', onPointerUp, true)
    window.removeEventListener('blur', onBlur)
  }
}
