import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { importCuras } from '../src/main/migratio/importer'
import type { ImportedCura } from '../src/main/migratio/types'

const databases: DatabaseSync[] = []
const database = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  databases.push(db)
  db.exec(`CREATE TABLE cura (id TEXT PRIMARY KEY, title TEXT NOT NULL, color TEXT NOT NULL, habitus_id TEXT, always_on_top INTEGER NOT NULL DEFAULT 0, opacity REAL NOT NULL DEFAULT 1, created_at TEXT NOT NULL, last_active_at TEXT NOT NULL);
CREATE TABLE page (id TEXT PRIMARY KEY, cura_id TEXT NOT NULL, url TEXT NOT NULL, title TEXT NOT NULL DEFAULT '', favicon TEXT, thumbnail TEXT, first_visit TEXT NOT NULL, last_visit TEXT NOT NULL, pinned INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE edge (id INTEGER PRIMARY KEY, cura_id TEXT NOT NULL, from_page_id TEXT, to_page_id TEXT, kind TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 1, last_at TEXT NOT NULL);
CREATE TABLE visit (id INTEGER PRIMARY KEY, page_id TEXT NOT NULL, visited_at TEXT NOT NULL);
CREATE VIRTUAL TABLE page_fts USING fts5(title, url, content);`)
  return db
}
afterEach(() => { for (const db of databases.splice(0)) db.close() })

const cura: ImportedCura = { key: 'history:chrome:2026-08', title: 'Imported: chrome history (2026-08)', color: '#475569', pages: [
  { url: 'https://example.com/a?utm_source=x', title: 'A', pinned: false, visitedAt: '2026-08-01T00:00:00.000Z' },
  { url: 'https://example.com/a', title: 'A later', pinned: true, visitedAt: '2026-08-02T00:00:00.000Z' }
], edges: [] }

describe('Migratio importer', () => {
  it('is idempotent and aggregates normalized pages', () => {
    const db = database()
    importCuras(db, [cura])
    importCuras(db, [cura])
    expect(db.prepare('SELECT COUNT(*) AS count FROM cura').get()).toMatchObject({ count: 1 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM page').get()).toMatchObject({ count: 1 })
    expect(db.prepare('SELECT COUNT(*) AS count FROM visit').get()).toMatchObject({ count: 2 })
    expect(db.prepare('SELECT title, first_visit, last_visit FROM page').get()).toMatchObject({
      title: 'A later',
      first_visit: '2026-08-01T00:00:00.000Z',
      last_visit: '2026-08-02T00:00:00.000Z'
    })
    expect(db.prepare('SELECT title, url FROM page_fts').get()).toMatchObject({
      title: 'A later',
      url: 'https://example.com/a'
    })
  })
})
