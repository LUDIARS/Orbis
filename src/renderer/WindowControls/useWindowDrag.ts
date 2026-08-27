import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { WINDOW_DRAG_THRESHOLD_PX } from '../../shared/ipc-contract'

interface DragState {
  pointerId: number
  startX: number
  startY: number
  dragging: boolean
}

interface WindowDragBindings {
  onPointerDown(event: ReactPointerEvent<HTMLElement>): void
  onPointerMove(event: ReactPointerEvent<HTMLElement>): void
  onPointerUp(event: ReactPointerEvent<HTMLElement>): void
  onPointerCancel(event: ReactPointerEvent<HTMLElement>): void
  onLostPointerCapture(event: ReactPointerEvent<HTMLElement>): void
}

/** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
export function useWindowDrag(onTap?: () => void, selfOnly = false): WindowDragBindings {
  const state = useRef<DragState | null>(null)
  /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
  const finish = (event: ReactPointerEvent<HTMLElement>, allowTap: boolean): void => {
    const active = state.current
    if (!active || event.pointerId !== active.pointerId) return
    state.current = null
    if (active.dragging) window.orbis.windowDrag({ phase: 'end', screenX: event.screenX, screenY: event.screenY })
    else if (allowTap) onTap?.()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  return {
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
    onPointerDown: (event) => {
      if (event.button !== 0 || !event.isPrimary || (selfOnly && event.target !== event.currentTarget)) return
      state.current = { pointerId: event.pointerId, startX: event.screenX, startY: event.screenY, dragging: false }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
    onPointerMove: (event) => {
      const active = state.current
      if (!active || event.pointerId !== active.pointerId) return
      if (!active.dragging) {
        if (Math.hypot(event.screenX - active.startX, event.screenY - active.startY) < WINDOW_DRAG_THRESHOLD_PX) return
        active.dragging = true
        window.orbis.windowDrag({ phase: 'begin', screenX: active.startX, screenY: active.startY })
      }
      window.orbis.windowDrag({ phase: 'move', screenX: event.screenX, screenY: event.screenY })
    },
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
    onPointerUp: (event) => finish(event, true),
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
    onPointerCancel: (event) => finish(event, false),
    /** @implements SPEC-ORBIS-BORDERLESS-CONTROL-DRAG */
    onLostPointerCapture: (event) => finish(event, false)
  }
}
