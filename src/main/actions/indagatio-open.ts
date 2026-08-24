import type { Action } from './types.js'
/** @implements SPEC-ORBIS-P1-INDAGATIO */
export const indagatioOpen: Action = ({ window, cura }) => cura.focusSearch(window)
