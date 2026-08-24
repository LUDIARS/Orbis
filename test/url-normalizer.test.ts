import { describe, expect, it } from 'vitest'
import { normalizeGraphUrl } from '../src/main/nexus/url-normalizer.js'
describe('graph URL normalization', () => { it('removes fragment, tracking values, and trailing slashes', () => { expect(normalizeGraphUrl('https://example.com/path/?utm_source=x&fbclid=y#part')).toBe('https://example.com/path') }) })
