import type { Action } from './types.js'

export const pageForward: Action = ({ window, cura }) => cura.goForward(window)
