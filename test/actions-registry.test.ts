import { describe, expect, it } from 'vitest'
import { actionIds, isActionId } from '../src/main/actions/registry.js'
describe('action registry', () => { it('only resolves registered action ids', () => { expect(actionIds).toHaveLength(11); expect(isActionId('indagatio.open')).toBe(true); expect(isActionId('nexus.layout.toggle')).toBe(true); expect(isActionId('unknown')).toBe(false); expect(isActionId('toString')).toBe(false); expect(isActionId('__proto__')).toBe(false) }) })
