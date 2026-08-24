import { describe, expect, it } from 'vitest'
import { parseChromiumBookmarks } from '../src/main/migratio/chromium-bookmarks'

describe('Chromium bookmarks', () => {
  it('maps each root folder to a Cura and keeps nested pages in it', () => {
    const curas = parseChromiumBookmarks({ roots: { bookmark_bar: { children: [{ type: 'folder', name: 'Recipes', children: [
      { type: 'url', name: 'One', url: 'https://example.com/one?utm_source=x' },
      { type: 'folder', name: 'Dessert', children: [{ type: 'url', name: 'Two', url: 'https://example.com/two' }] }
    ] }] } } }, 'chrome')
    expect(curas).toHaveLength(1)
    expect(curas[0].pages.map((page) => page.url)).toEqual(['https://example.com/one', 'https://example.com/two'])
    expect(curas[0].edges).toMatchObject([{ kind: 'manual', fromUrl: 'https://example.com/one', toUrl: 'https://example.com/two' }])
  })

  it('keeps same-named Chromium folders as distinct Curas', () => {
    const curas = parseChromiumBookmarks({ roots: { bookmark_bar: { children: [
      { type: 'folder', id: '10', name: 'Reading', children: [{ type: 'url', url: 'https://one.example/' }] },
      { type: 'folder', id: '20', name: 'Reading', children: [{ type: 'url', url: 'https://two.example/' }] }
    ] } } }, 'chrome')

    expect(curas).toHaveLength(2)
    expect(curas.map((cura) => cura.key)).toEqual(['bookmarks:chrome:10', 'bookmarks:chrome:20'])
  })
})
