import type { Action } from './types.js'

/** @implements SPEC-ORBIS-BORDERLESS-CONTROL-MENU */
export const fenestraMinimize: Action = ({ window }) => window.minimize()
