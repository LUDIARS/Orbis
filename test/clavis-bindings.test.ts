import { describe, expect, it } from 'vitest'
import { bindingForAccelerator, defaultBindings } from '../src/main/clavis/bindings.js'
describe('default bindings', () => { it('contains global Rota and Fenestra bindings', () => { expect(defaultBindings.filter((binding) => binding.global)).toHaveLength(4); expect(bindingForAccelerator('CommandOrControl+Shift+Space')?.actionId).toBe('rota.open'); expect(bindingForAccelerator('CommandOrControl+Shift+T')?.actionId).toBe('fenestra.alwaysOnTop.toggle') }) })
