import type { Action } from './types.js'
export const habitusSetMobile: Action = ({ window, cura }) => cura.setHabitus(window, 'mobile')
