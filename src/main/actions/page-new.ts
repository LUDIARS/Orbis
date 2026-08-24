import type { Action } from './types.js'

export const pageNew: Action = ({ window, cura }) => cura.newPage(window)
