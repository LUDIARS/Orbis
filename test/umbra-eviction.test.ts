import { describe, expect, it } from 'vitest'
import { selectUmbraEvictions, UMBRA_PAGE_CAP } from '../src/main/umbra/service.js'

const candidate = (pageId: string, lastVisit: string): { pageId: string; lastVisit: string } => ({ pageId, lastVisit })

describe('umbra eviction', () => {
  it('keeps everything at or under the cap', () => {
    const candidates = Array.from({ length: UMBRA_PAGE_CAP }, (_item, index) => candidate(`p${index}`, `2026-08-24T00:0${index % 10}:00Z`))
    expect(selectUmbraEvictions(candidates)).toEqual([])
  })

  it('evicts the oldest pages beyond the cap', () => {
    const candidates = [
      candidate('newest', '2026-08-24T03:00:00Z'),
      candidate('oldest', '2026-08-24T01:00:00Z'),
      candidate('middle', '2026-08-24T02:00:00Z')
    ]
    expect(selectUmbraEvictions(candidates, 1)).toEqual(['oldest', 'middle'])
  })
})
