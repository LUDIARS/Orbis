import type { Action } from './types.js'

/** @implements SPEC-ORBIS-VITRUM-ACTION Cycles finite, validated presets for the current page. */
export const vitrumCycle: Action = ({ window, cura }) => cura.cycleVitrum(window)
