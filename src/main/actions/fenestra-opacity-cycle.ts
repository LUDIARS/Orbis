import type { Action } from './types.js'

export const fenestraOpacityCycle: Action = ({ window, cura }) => cura.cycleOpacity(window)
