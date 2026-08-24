import { describe, expect, it } from 'vitest'
import { timelineNodePositions } from '../src/renderer/GraphPane/timeline-layout'

describe('timelineNodePositions', () => {
  it('orders nodes by last visit along the x axis', () => {
    expect(timelineNodePositions([
      { id: 'later', url: 'https://later', title: 'Later', lastVisit: '2026-08-24T10:00:00.000Z' },
      { id: 'first', url: 'https://first', title: 'First', lastVisit: '2026-08-24T09:00:00.000Z' }
    ])).toEqual([
      { id: 'first', x: 60, y: 120 },
      { id: 'later', x: 210, y: 120 }
    ])
  })
})
