import type { Action } from './types.js'
export const habitusSetShopping: Action = ({ window, cura }) => cura.setHabitus(window, 'shopping')
