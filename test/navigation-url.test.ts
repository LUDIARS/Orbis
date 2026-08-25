import { describe, expect, it } from 'vitest'
import {
  isAllowedExplorationUrl,
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

  it.each([
    'http://localhost',
    'http://localhost.',
    'http://printer.local.',
    'http://127.0.0.1',
    'http://10.0.0.5',
    'http://172.16.0.5',
    'http://192.168.0.5',
    'http://[::1]',
    'https://example.com:8443'
  ])('blocks private or nonstandard exploration target %s', (value) => {
    expect(isAllowedExplorationUrl(value)).toBe(false)
  })

  it('allows a public HTTP(S) exploration target', () => {
    expect(isAllowedExplorationUrl('https://example.com/article')).toBe(true)
  })
})
