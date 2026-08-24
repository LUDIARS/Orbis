import { describe, expect, it } from 'vitest'
import { resolveNavigationParent } from '../src/main/nexus/navigation-tracker.js'
describe('navigation tracker', () => { it('uses initial parent before a view commits and current page after', () => { expect(resolveNavigationParent(false, 'current', 'parent')).toBe('parent'); expect(resolveNavigationParent(true, 'current', 'parent')).toBe('current') }) })
