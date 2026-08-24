import { describe, expect, it } from 'vitest'
import { GraphStore } from '../src/main/nexus/graph-store.js'
describe('GraphStore', () => { it('restores nodes and aggregates an edge', () => { const store = new GraphStore(); store.restore('c', { nodes: [{ id: 'a', url: 'https://a', title: 'A', lastVisit: '1' }], edges: [] }); store.addEdge('c', { from: 'a', to: 'b', kind: 'navigate', count: 1, lastAt: '2' }); store.addEdge('c', { from: 'a', to: 'b', kind: 'navigate', count: 1, lastAt: '3' }); expect(store.snapshot('c', 'a').edges[0]).toMatchObject({ count: 2, lastAt: '3' }) }) })
