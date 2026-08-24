import type { ReactElement } from 'react'
import type { GestureOverlayState } from '../../shared/ipc-contract'

/** @implements SPEC-ORBIS-P3-OVERLAY */
export function GestureOverlay({ state }: { state: GestureOverlayState }): ReactElement | null {
  if (!state.active) return null
  const points = state.points.map((point) => `${point.x},${point.y}`).join(' ')
  return <aside style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99 }}>
    <svg width="100%" height="100%"><polyline points={points} fill="none" stroke="#65d6ff" strokeWidth="3" /></svg>
    <span style={{ position: 'fixed', left: 12, bottom: 12, background: '#10243ddd', color: 'white', padding: 8 }}>{state.stroke ?? '…'} {state.actionName ?? ''}</span>
  </aside>
}
