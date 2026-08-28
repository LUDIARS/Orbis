/** @implements SPEC-ORBIS-VITRUM-SPEC */
export type FilterKind = 'brightness' | 'contrast' | 'saturate' | 'hue-rotate' | 'invert' | 'sepia' | 'grayscale' | 'blur'
export interface FilterStep { kind: FilterKind; value: number }

const ranges: Record<FilterKind, readonly [number, number]> = {
  brightness: [0, 3], contrast: [0, 3], saturate: [0, 3], 'hue-rotate': [0, 360],
  invert: [0, 1], sepia: [0, 1], grayscale: [0, 1], blur: [0, 20]
}

export function validateFilters(value: unknown): FilterStep[] {
  if (!Array.isArray(value) || value.length > 16) throw new TypeError('filters must contain at most 16 steps.')
  return value.map((step) => {
    if (typeof step !== 'object' || step === null || Object.keys(step).length !== 2) throw new TypeError('A filter step has unknown fields.')
    const { kind, value: amount } = step as { kind?: unknown; value?: unknown }
    if (typeof kind !== 'string' || !Object.hasOwn(ranges, kind) || typeof amount !== 'number' || !Number.isFinite(amount)) throw new TypeError('Invalid filter step.')
    const [min, max] = ranges[kind as FilterKind]
    if (amount < min || amount > max) throw new RangeError(`Filter ${kind} is outside its allowed range.`)
    return { kind: kind as FilterKind, value: amount }
  })
}

/** @implements SPEC-ORBIS-VITRUM-SPEC Generates CSS from a finite filter language; callers never supply CSS or SVG. */
export function cssForFilters(filters: FilterStep[]): string {
  const declaration = filters.map(({ kind, value }) => {
    if (kind === 'hue-rotate') return `hue-rotate(${value}deg)`
    if (kind === 'blur') return `blur(${value}px)`
    return `${kind}(${value})`
  }).join(' ')
  return `html { filter: ${declaration || 'none'} !important; }`
}
