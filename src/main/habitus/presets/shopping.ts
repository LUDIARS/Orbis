import type { HabitusPreset } from '../types.js'

/** @implements SPEC-ORBIS-P2-HABITUS */
export const shoppingPreset: HabitusPreset = {
  id: 'shopping', userAgent: null, width: null, height: null,
  deviceScaleFactor: null, partition: 'persist:shopping', touch: false
}
