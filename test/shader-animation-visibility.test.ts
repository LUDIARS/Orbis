import { describe, expect, it } from 'vitest'
import { shouldAnimate } from '../src/renderer/shader/animation-visibility'

describe('shouldAnimate', () => {
  it('runs only for an active, visible, focused window', () => {
    expect(shouldAnimate(true, 'visible', true)).toBe(true)
    expect(shouldAnimate(true, 'hidden', true)).toBe(false)
    expect(shouldAnimate(true, 'visible', false)).toBe(false)
    expect(shouldAnimate(false, 'visible', true)).toBe(false)
  })
})
