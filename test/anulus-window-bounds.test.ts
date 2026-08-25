import { describe, expect, it } from 'vitest'
import { clampWindowBounds } from '../src/main/anulus/window-bounds.js'

describe('Anulus window bounds', () => {
  it('keeps a restored circle inside the available work area', () => {
    expect(clampWindowBounds({ x: 1900, y: 1000, width: 270, height: 270 }, { x: 0, y: 0, width: 1920, height: 1080 })).toEqual({ x: 1650, y: 810, width: 270, height: 270 })
  })
  it('shrinks a saved window that is larger than its current display', () => {
    expect(clampWindowBounds({ x: -20, y: -20, width: 500, height: 400 }, { x: 0, y: 0, width: 320, height: 240 })).toEqual({ x: 0, y: 0, width: 320, height: 240 })
  })
  it('does not restore invalid non-positive dimensions from local state', () => {
    expect(clampWindowBounds({ x: 10, y: 10, width: 0, height: -20 }, { x: 0, y: 0, width: 320, height: 240 })).toEqual({ x: 10, y: 10, width: 1, height: 1 })
  })
})
