import type { Action } from './types.js'
/** @implements SPEC-ORBIS-P1-NEXUS */
export const nexusLayoutToggle: Action = ({ window, cura }) => cura.toggleGraphLayout(window)
