import { describe, expect, it } from 'vitest'
import { normalizeGraphUrl } from '../src/main/nexus/url-normalizer.js'
describe('graph URL normalization', () => { it('removes fragment, tracking values, and trailing slashes', () => { expect(normalizeGraphUrl('https://example.com/path/?utm_source=x&fbclid=y#part')).toBe('https://example.com/path') }) })
describe('shared URL normalization', () => { it('removes the combined tracking parameter set', () => { expect(normalizeGraphUrl('https://example.com/?mc_cid=x&mc_eid=y&gclid=z&keep=v')).toBe('https://example.com/?keep=v') }); it('rejects non-web URLs through the shared function', () => { expect(() => normalizeGraphUrl('file:///private/data')).toThrow(TypeError) }) })
