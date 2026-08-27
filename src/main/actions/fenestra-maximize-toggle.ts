import type { Action } from './types.js'

/** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU */
export const fenestraMaximizeToggle: Action = ({ window }) => {
  if (window.isMaximized()) window.unmaximize()
  else window.maximize()
}
