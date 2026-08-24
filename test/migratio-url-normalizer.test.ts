import { describe, expect, it } from 'vitest'
import { normalizeUrl } from '../src/main/migratio/url-normalizer'

describe('Migratio URL normalization', () => {
  it('removes fragments and tracking parameters', () => {
    expect(normalizeUrl('https://example.com/path/?utm_source=x&fbclid=y&keep=z#part')).toBe('https://example.com/path?keep=z')
  })

  it('removes a non-root trailing slash', () => {
    expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path')
  })

  it('rejects non-web URLs', () => {
    expect(normalizeUrl('file:///private/data')).toBeNull()
  })

  it('removes credentials embedded in a web URL', () => {
    expect(normalizeUrl('https://user:secret@example.com/path')).toBe('https://example.com/path')
  })
})
