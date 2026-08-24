import type { HabitusPreset } from '../types.js'

/** @implements SPEC-ORBIS-P2-HABITUS */
export const mobilePreset: HabitusPreset = {
  id: 'mobile',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  width: 390, height: 844, deviceScaleFactor: 3, partition: 'persist:mobile', touch: true
}
