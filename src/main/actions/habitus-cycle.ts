import type { Action } from './types.js'

/** @implements SPEC-ORBIS-P3-CLAVIS */
export const habitusCycle: Action = ({ window, cura }) => cura.cycleHabitus(window)
