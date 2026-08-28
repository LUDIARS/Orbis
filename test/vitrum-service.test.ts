import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VitrumRepository } from '../src/main/tabularium/repositories/vitrum-repo.js'
import { VitrumService } from '../src/main/vitrum/service.js'

function service(): VitrumService {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync('src/main/tabularium/migrations/0006_vitrum.sql', 'utf8'))
  return new VitrumService(new VitrumRepository(db))
}

describe('VitrumService', () => {
  it('uses a page spec before the Habitus default and persists validated specs', () => {
    const vitrum = service()
    vitrum.saveHabitus('desktop', { id: 'low-stimulus', filters: [] })
    expect(vitrum.stateFor('page', 'desktop').spec.id).toBe('low-stimulus')
    vitrum.savePage('page', { id: 'high-contrast', filters: [] })
    expect(vitrum.stateFor('page', 'desktop').spec.id).toBe('high-contrast')
  })
  it('rejects oversized and unknown specs before persistence', () => {
    const vitrum = service()
    expect(() => vitrum.savePage('page', { id: 'x'.repeat(65), filters: [] })).toThrow()
    expect(() => vitrum.savePage('page', { id: 'custom', filters: [], rawCss: 'html{}' })).toThrow()
  })
  it('cycles across the bundled finite presets', () => {
    const vitrum = service()
    expect(vitrum.cycle('page', 'desktop').id).toBe('night-invert')
  })
})
