import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CuraRepository, type Cura } from '../src/main/tabularium/repositories/cura-repo.js'
import { PageRepository, type Page } from '../src/main/tabularium/repositories/page-repo.js'

const openMemoryDb = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  db.exec('PRAGMA foreign_keys = ON')
  db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
  return db
}
const cura: Cura = { id: 'cura', title: 'Cura', color: '#000', habitusId: null, alwaysOnTop: false, opacity: 1, createdAt: '2026-01-01', lastActiveAt: '2026-01-01' }
const page = (id: string, url: string): Page => ({ id, curaId: 'cura', url, title: '', firstVisit: '2026-01-01', lastVisit: '2026-01-01', active: true })

describe('tabularium repositories', () => {
  it('restores a cura and only its active pages', () => {
    const db = openMemoryDb()
    try {
      new CuraRepository(db).save(cura)
      const pages = new PageRepository(db)
      pages.save(page('p1', 'https://example.com'))
      pages.save(page('p2', 'https://example.org'))
      pages.deactivate('p2')
      expect(new CuraRepository(db).list().map((item) => item.id)).toEqual(['cura'])
      expect(pages.listByCura('cura').map((item) => item.id)).toEqual(['p1'])
    } finally {
      db.close()
    }
  })

  it('records visits and aggregates repeated navigation edges', () => {
    const db = openMemoryDb()
    try {
      new CuraRepository(db).save(cura)
      const pages = new PageRepository(db)
      pages.recordNavigation('cura', null, page('p1', 'https://example.com'))
      pages.recordNavigation('cura', 'p1', page('p2', 'https://example.org'))
      pages.recordNavigation('cura', 'p1', page('p2', 'https://example.org'))
      expect(db.prepare('SELECT count(*) AS n FROM edge').get()?.n).toBe(1)
      expect(db.prepare('SELECT count AS n FROM edge').get()?.n).toBe(2)
      expect(db.prepare('SELECT count(*) AS n FROM visit').get()?.n).toBe(3)
    } finally {
      db.close()
    }
  })

  it('rolls back the page and visit when an edge violates a foreign key', () => {
    const db = openMemoryDb()
    try {
      new CuraRepository(db).save(cura)
      const pages = new PageRepository(db)
      expect(() => pages.recordNavigation('cura', 'missing', page('p1', 'https://example.com'))).toThrow()
      expect(db.prepare('SELECT count(*) AS n FROM page').get()?.n).toBe(0)
      expect(db.prepare('SELECT count(*) AS n FROM visit').get()?.n).toBe(0)
    } finally {
      db.close()
    }
  })
})
