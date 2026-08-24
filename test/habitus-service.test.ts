import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { HabitusService } from '../src/main/habitus/service.js'
import { CuraRepository, type Cura } from '../src/main/tabularium/repositories/cura-repo.js'

const cura: Cura = { id: 'cura', title: 'Cura', color: '#000', habitusId: 'desktop', alwaysOnTop: false, opacity: 1, createdAt: '2026-01-01', lastActiveAt: '2026-01-01' }
const db = (): DatabaseSync => { const value = new DatabaseSync(':memory:'); value.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8')); return value }

describe('HabitusService', () => {
  it('uses the Cura default and stores a page override', () => {
    const database = db(); try { new CuraRepository(database).save(cura); const service = new HabitusService(database); expect(service.resolve(cura, 'page')).toBe('desktop'); service.setPageOverride('page', 'mobile'); const updated = service.setCuraDefault(cura, 'shopping'); expect(service.resolve(updated, 'page')).toBe('mobile') } finally { database.close() }
  })
  it('persists the Cura default', () => {
    const database = db(); try { new CuraRepository(database).save(cura); const service = new HabitusService(database); service.setCuraDefault(cura, 'shopping'); expect(new CuraRepository(database).list()[0].habitusId).toBe('shopping') } finally { database.close() }
  })
})
