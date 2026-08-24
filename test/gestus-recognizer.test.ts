import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { recognizeGesture } from '../src/main/gestus/recognizer.js'
import { resolveGesture } from '../src/main/gestus/bindings.js'
import { BindingStore } from '../src/main/clavis/binding-store.js'
import { normalizeAccelerator } from '../src/main/clavis/bindings.js'

const points = (...values: [number, number, number][]) => values.map(([x, y, at]) => ({ x, y, at }))
const store = (): BindingStore => { const db = new DatabaseSync(':memory:'); db.exec('CREATE TABLE binding (id TEXT PRIMARY KEY, action_id TEXT NOT NULL, accelerator TEXT NOT NULL, scope TEXT NOT NULL)'); return new BindingStore(db) }

describe('Gestus and Clavis P3', () => {
  it('recognizes a right stroke', () => expect(recognizeGesture(points([0, 0, 0], [40, 0, 20]))).toBe('R'))
  it('recognizes an L shaped stroke', () => expect(recognizeGesture(points([60, 0, 0], [0, 0, 20], [0, -40, 40]))).toBe('LU'))
  it('ignores motion below the threshold', () => expect(recognizeGesture(points([0, 0, 0], [10, 0, 20]))).toBeNull())
  it('ignores timed out input', () => expect(recognizeGesture(points([0, 0, 0], [40, 0, 1600]))).toBeNull())
  it('resolves the default DR gesture', () => expect(resolveGesture('DR', store())).toBe('page.close'))
  it('upserts a gesture binding without removing other defaults', () => { const bindings = store(); bindings.save({ id: 'gesture:page.close', actionId: 'page.close', accelerator: 'UL', scope: 'gesture' }); expect(resolveGesture('UL', bindings)).toBe('page.close'); expect(resolveGesture('DR', bindings)).toBeUndefined(); expect(resolveGesture('R', bindings)).toBe('page.forward') })
  it('rejects duplicate accelerators including defaults', () => { const bindings = store(); expect(() => bindings.save({ id: 'gesture:page.close', actionId: 'page.close', accelerator: 'L', scope: 'gesture' })).toThrow('Binding conflict') })
  it('normalizes accelerator aliases', () => expect(normalizeAccelerator('ctrl + shift + t')).toBe('CommandOrControl+Shift+T'))
  it('normalizes modifier order', () => expect(normalizeAccelerator('t + shift + ctrl')).toBe('CommandOrControl+Shift+T'))
  it('keeps unsaved key defaults after overriding one binding', () => { const bindings = store(); bindings.save({ id: 'cura.new', actionId: 'cura.new', accelerator: 'Alt+N', scope: 'key' }); expect(bindings.list('key')).toHaveLength(7); expect(bindings.list('key').find((binding) => binding.id === 'cura.new')?.accelerator).toBe('Alt+N'); expect(bindings.list('key').find((binding) => binding.id === 'rota.open')?.accelerator).toBe('CommandOrControl+Shift+Space') })
})
