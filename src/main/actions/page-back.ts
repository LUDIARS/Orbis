import type { Action } from './types.js'

export const pageBack: Action = ({ window, cura }) => cura.goBack(window)
