import type { ActionId } from '../actions/types.js'
import type { BindingStore } from '../clavis/binding-store.js'

/** @implements SPEC-ORBIS-P3-GESTUS */
export const defaultGestureBindings: Record<string, ActionId> = {
  L: 'page.back', R: 'page.forward', UD: 'page.reload', DR: 'page.close'
}

/** @implements SPEC-ORBIS-P3-GESTUS */
export function resolveGesture(stroke: string, store: BindingStore): ActionId | undefined {
  return store.list('gesture').find((binding) => binding.accelerator === stroke)?.actionId
}
