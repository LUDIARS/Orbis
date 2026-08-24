import { describe, expect, it } from 'vitest'
import { nextWheelItemId, wheelPositions } from '../src/renderer/Rota/wheel-layout'

describe('Rota wheel layout', () => {
  it('spaces Cura items evenly around the wheel', () => {
    const positions = wheelPositions([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }], 0, 100)
    expect(positions.map((position) => Math.round(position.angle * 1000) / 1000)).toEqual([-1.571, 0, 1.571, 3.142])
  })

  it('applies rotation to each item position', () => {
    const [position] = wheelPositions([{ id: 'a' }], Math.PI / 2, 100)
    expect(position).toMatchObject({ id: 'a', x: 100, y: 0 })
  })

  it('cycles the selected Cura in either direction', () => {
    const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    expect(nextWheelItemId(items, null, 1)).toBe('a')
    expect(nextWheelItemId(items, 'a', -1)).toBe('c')
    expect(nextWheelItemId(items, 'c', 1)).toBe('a')
  })
})
