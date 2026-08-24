import { describe, expect, it } from 'vitest'
import { bindingForAccelerator, defaultBindings } from '../src/main/clavis/bindings.js'
describe('default bindings', () => { it('contains global Fenestra bindings', () => { expect(defaultBindings.filter((binding) => binding.global)).toHaveLength(3); expect(bindingForAccelerator('CommandOrControl+Shift+T')?.actionId).toBe('fenestra.alwaysOnTop.toggle') }) })
