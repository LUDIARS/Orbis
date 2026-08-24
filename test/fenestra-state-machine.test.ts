import { describe, expect, it } from 'vitest'
import { cycleOpacity, toggleAlwaysOnTop } from '../src/main/fenestra/state-machine.js'
describe('fenestra state', () => { it('cycles opacity', () => { expect(cycleOpacity({ alwaysOnTop: false, opacity: 1 }).opacity).toBe(.7); expect(toggleAlwaysOnTop({ alwaysOnTop: false, opacity: 1 }).alwaysOnTop).toBe(true) }) })
