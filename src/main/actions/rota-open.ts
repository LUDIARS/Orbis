import type { Action } from './types.js'

/** @implements SPEC-ORBIS-P4-OVERLAY */
export const rotaOpen: Action = ({ rota }) => rota.open()
