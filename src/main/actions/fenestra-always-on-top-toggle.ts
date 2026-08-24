import type { Action } from './types.js'

export const fenestraAlwaysOnTopToggle: Action = ({ window, cura }) => cura.toggleAlwaysOnTop(window)
