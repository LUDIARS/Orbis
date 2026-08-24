import { describe, expect, it } from 'vitest'
import { FormaRegistry } from '../src/main/forma/registry.js'
import { amazonForma } from '../src/main/forma/sites/amazon/index.js'

describe('FormaRegistry', () => {
  it('matches Amazon only for shopping', () => {
    const registry = new FormaRegistry([amazonForma])
    expect(registry.matching('https://www.amazon.co.jp/dp/example', 'shopping')).toHaveLength(1)
    expect(registry.matching('https://www.amazon.com/dp/example', 'shopping')).toHaveLength(1)
    expect(registry.matching('https://www.amazon.co.jp/dp/example', 'desktop')).toHaveLength(0)
    expect(registry.matching('https://amazon.example/dp/example', 'shopping')).toHaveLength(0)
  })
})
