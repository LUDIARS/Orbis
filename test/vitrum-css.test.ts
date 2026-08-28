import { describe, expect, it } from 'vitest'
import { cssForFilters, validateFilters } from '../src/main/vitrum/css.js'

describe('Vitrum CSS', () => {
  it('generates CSS only from the finite filter language', () => {
    expect(cssForFilters(validateFilters([{ kind: 'hue-rotate', value: 180 }, { kind: 'blur', value: 2 }]))).toBe('html { filter: hue-rotate(180deg) blur(2px) !important; }')
  })
  it('rejects raw CSS, unknown fields, and invalid numeric ranges', () => {
    expect(() => validateFilters([{ kind: 'url(#raw)', value: 1 }])).toThrow()
    expect(() => validateFilters([{ kind: 'blur', value: 21 }])).toThrow()
    expect(() => validateFilters([{ kind: 'invert', value: 1, css: 'x' }])).toThrow()
  })
})
