import { describe, expect, it } from 'vitest'
import { isNavigationMode, looksLikeUrl, resolveNavigationTarget } from '../src/shared/navigation-intent.js'

describe('navigation intent', () => {
  it('treats explicit HTTP(S), bare hosts and local addresses as URLs', () => {
    for (const value of [
      'https://example.com',
      'http://example.com/path?q=1',
      'example.com',
      'www.example.co.jp/a/b',
      'localhost:5173',
      '127.0.0.1:8080/health'
    ]) expect(looksLikeUrl(value), value).toBe(true)
  })

  it('treats anything with spaces, no TLD, or a leading ? as a search', () => {
    for (const value of [
      'electron webcontentsview',
      'example',
      'なぜ空が青いのか',
      '?example.com',
      'file:///E:/tmp/page.html',
      'C++ とは'
    ]) expect(looksLikeUrl(value), value).toBe(false)
  })

  it('lets the mode override the guess and strips the search marker', () => {
    expect(resolveNavigationTarget('example.com', 'search')).toEqual({ kind: 'search', value: 'example.com' })
    expect(resolveNavigationTarget('hello world', 'url')).toEqual({ kind: 'url', value: 'hello world' })
    expect(resolveNavigationTarget('?example.com')).toEqual({ kind: 'search', value: 'example.com' })
    expect(resolveNavigationTarget('?')).toBeNull()
    expect(resolveNavigationTarget('?   ', 'search')).toBeNull()
  })

  it('returns null for blank input and validates the mode at the boundary', () => {
    expect(resolveNavigationTarget('   ')).toBeNull()
    expect(isNavigationMode('auto')).toBe(true)
    expect(isNavigationMode('image')).toBe(false)
  })
})
