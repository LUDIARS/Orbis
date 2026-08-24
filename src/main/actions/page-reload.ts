import type { Action } from './types.js'

export const pageReload: Action = ({ window, cura }) => cura.reload(window)
