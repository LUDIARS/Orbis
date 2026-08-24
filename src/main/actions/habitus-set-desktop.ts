import type { Action } from './types.js'
export const habitusSetDesktop: Action = ({ window, cura }) => cura.setHabitus(window, 'desktop')
