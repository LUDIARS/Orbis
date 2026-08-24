import { desktopPreset } from './desktop.js'
import { mobilePreset } from './mobile.js'
import { shoppingPreset } from './shopping.js'
import type { HabitusId, HabitusPreset } from '../types.js'

export const habitusPresets: Record<HabitusId, HabitusPreset> = {
  desktop: desktopPreset, mobile: mobilePreset, shopping: shoppingPreset
}

export const isHabitusId = (value: unknown): value is HabitusId =>
  value === 'desktop' || value === 'mobile' || value === 'shopping'
