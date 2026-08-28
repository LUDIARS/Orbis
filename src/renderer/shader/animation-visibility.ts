/** @implements SPEC-ORBIS-UIRICH-PERF */
export function shouldAnimate(active: boolean, visibilityState: DocumentVisibilityState, focused: boolean): boolean {
  return active && visibilityState === 'visible' && focused
}
