import { describe, expect, it } from 'vitest'
import { googleForma } from '../src/main/forma/sites/google/index.js'
import { googleResultHref, googleResultLinks } from '../src/main/forma/sites/google/result-links.js'

describe('Google search Forma result links', () => {
  it('unwraps a fixture-shaped Google redirect and rejects non-web targets', () => {
    expect(googleResultHref('/url?q=https%3A%2F%2Fexample.com%2Farticle')).toBe('https://example.com/article')
    expect(googleResultHref('javascript:alert(1)')).toBeNull()
    expect(googleResultHref('/url?q=https%3A%2F%2Fuser%3Apass%40example.com')).toBeNull()
  })

  it('matches Google country domains without accepting lookalike suffixes', () => {
    expect(googleForma.match(new URL('https://www.google.co.jp/search'))).toBe(true)
    expect(googleForma.match(new URL('https://google.com.evil.example/search'))).toBe(false)
  })

  it('validates fixture-shaped values at the renderer boundary', () => {
    expect(googleResultLinks([
      { url: '/url?q=https%3A%2F%2Fexample.com%2Farticle', title: 'Article' },
      { url: 'https://example.com/article', title: 'Duplicate' },
      { url: 'https://example.com/empty', title: '   ' },
      { url: 'javascript:alert(1)', title: 'Unsafe' },
      { url: 42, title: 'Wrong type' }
    ])).toEqual([{ url: 'https://example.com/article', title: 'Article' }])
  })
})
