import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { ComparatioService } from '../src/main/comparatio/service.js'
import { CuraRepository, type Cura } from '../src/main/tabularium/repositories/cura-repo.js'

const cura: Cura = { id: 'cura', title: 'Cura', color: '#000', habitusId: 'shopping', alwaysOnTop: false, opacity: 1, createdAt: '2026-01-01', lastActiveAt: '2026-01-01' }
describe('ComparatioService', () => {
  it('upserts products idempotently per Cura', () => {
    const db = new DatabaseSync(':memory:'); try { db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8')); db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8')); new CuraRepository(db).save(cura); const service = new ComparatioService(db); service.upsert('cura', { title: 'A', price: '¥1', rating: null, reviewCount: null, delivery: null, url: 'https://example.com/a' }); service.upsert('cura', { title: 'A+', price: '¥2', rating: '4.0', reviewCount: null, delivery: null, url: 'https://example.com/a' }); expect(service.list('cura')).toMatchObject([{ title: 'A+', price: '¥2', rating: '4.0' }]); expect(service.list('cura')).toHaveLength(1) } finally { db.close() }
  })
})
