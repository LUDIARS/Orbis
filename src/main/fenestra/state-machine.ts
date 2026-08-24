export interface FenestraState { alwaysOnTop: boolean; opacity: number }
const opacities = [1, 0.7, 0.4] as const
/** @implements SPEC-ORBIS-P0-FENESTRA */
export const toggleAlwaysOnTop = (state: FenestraState): FenestraState => ({ ...state, alwaysOnTop: !state.alwaysOnTop })
/** @implements SPEC-ORBIS-P0-FENESTRA */
export const cycleOpacity = (state: FenestraState): FenestraState => ({ ...state, opacity: opacities[(opacities.indexOf(state.opacity as typeof opacities[number]) + 1) % opacities.length] })
