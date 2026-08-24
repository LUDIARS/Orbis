import type { Action } from './types.js'

export const pageClose: Action = ({ window, cura }) => cura.closePage(window)
