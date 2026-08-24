import { describe, expect, it } from 'vitest'
import {
  normalizeDevelopmentRendererUrl,
  normalizeNavigationUrl
} from '../src/main/cura/navigation-url.js'

describe('navigation URL boundary', () => {
  it('adds HTTPS to a host and preserves HTTP URLs', () => {
    expect(normalizeNavigationUrl('example.com')).toBe('https://example.com/')
    expect(normalizeNavigationUrl('http://example.com/path')).toBe('http://example.com/path')
  })

  it.each(['file:///etc/passwd', 'javascript:alert(1)', 'data:text/html,hello']) (
    'rejects the unsafe scheme in %s',
    (value) => expect(() => normalizeNavigationUrl(value)).toThrow(/protocol/i)
  )

  it('only permits a loopback development renderer without credentials', () => {
    expect(normalizeDevelopmentRendererUrl('http://localhost:5173')).toBe('http://localhost:5173/')
    expect(() => normalizeDevelopmentRendererUrl('https://example.com')).toThrow(/loopback/i)
    expect(() => normalizeDevelopmentRendererUrl('http://user:secret@localhost:5173')).toThrow(/credentials/i)
  })
})
