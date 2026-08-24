import { describe, expect, it } from 'vitest'
import { actionIds, isActionId } from '../src/main/actions/registry.js'
describe('action registry', () => { it('only resolves registered action ids', () => { expect(actionIds).toHaveLength(9); expect(isActionId('page.reload')).toBe(true); expect(isActionId('unknown')).toBe(false); expect(isActionId('toString')).toBe(false); expect(isActionId('__proto__')).toBe(false) }) })
