import type { HabitusPreset } from '../types.js'

/** @implements SPEC-ORBIS-P2-HABITUS */
export const desktopPreset: HabitusPreset = {
  id: 'desktop', userAgent: null, width: null, height: null,
  deviceScaleFactor: null, partition: 'persist:desktop', touch: false
}
