import { describe, expect, it } from 'vitest'
import { buildRotaCura, sortRotaPages } from '../src/main/rota/snapshot.js'
import { filterRotaSnapshot } from '../src/main/rota/search.js'

const pages = [
  { id: 'older', curaId: 'cura', url: 'https://old.example', title: 'Old', firstVisit: '1', lastVisit: '2026-08-24T09:00:00.000Z', active: true },
  { id: 'newer', curaId: 'cura', url: 'https://new.example', title: 'New', firstVisit: '1', lastVisit: '2026-08-24T10:00:00.000Z', active: true }
]

describe('Rota snapshot', () => {
  it('sorts pages by most recent visit first', () => {
    expect(sortRotaPages(pages).map((page) => page.id)).toEqual(['newer', 'older'])
  })

  it('includes the graph node count and page metadata', () => {
    expect(buildRotaCura({ id: 'cura', title: 'Research', color: '#123456' }, pages, 4)).toMatchObject({
      id: 'cura', title: 'Research', color: '#123456', nodeCount: 4, pages: [{ id: 'newer' }, { id: 'older' }]
    })
  })

  it('keeps only FTS-matched pages when searching', () => {
    const repository = { search: () => ['newer'] }
    const result = filterRotaSnapshot(repository as never, {
      curas: [buildRotaCura({ id: 'cura', title: 'Research', color: '#123456' }, pages, 2)]
    }, 'new')
    expect(result.curas[0]?.pages.map((page) => page.id)).toEqual(['newer'])
  })
})
