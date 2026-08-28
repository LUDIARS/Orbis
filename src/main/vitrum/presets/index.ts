import type { FilterStep } from '../css.js'

/** @implements SPEC-ORBIS-VITRUM-PRESETS */
export interface VitrumPreset { id: string; filters: FilterStep[] }

export const vitrumPresets: readonly VitrumPreset[] = [
  { id: 'none', filters: [] },
  { id: 'night-invert', filters: [{ kind: 'invert', value: 1 }, { kind: 'hue-rotate', value: 180 }, { kind: 'brightness', value: 0.92 }, { kind: 'contrast', value: 0.9 }] },
  { id: 'low-stimulus', filters: [{ kind: 'brightness', value: 0.9 }, { kind: 'saturate', value: 0.65 }, { kind: 'contrast', value: 0.9 }] },
  { id: 'high-contrast', filters: [{ kind: 'contrast', value: 1.35 }, { kind: 'brightness', value: 1.05 }] },
  { id: 'sepia-paper', filters: [{ kind: 'sepia', value: 0.65 }, { kind: 'saturate', value: 0.75 }, { kind: 'brightness', value: 1.05 }] }
]

/** @implements SPEC-ORBIS-VITRUM-PRESETS */
export function presetById(id: string): VitrumPreset | undefined { return vitrumPresets.find((preset) => preset.id === id) }
