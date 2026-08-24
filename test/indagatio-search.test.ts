import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CuraRepository } from '../src/main/tabularium/repositories/cura-repo.js'
import { PageRepository } from '../src/main/tabularium/repositories/page-repo.js'
import { searchPages } from '../src/main/indagatio/search.js'
describe('Indagatio search', () => { it('finds indexed page text', () => { const db = new DatabaseSync(':memory:'); db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8')); new CuraRepository(db).save({ id: 'c', title: 'C', color: '#000', habitusId: null, alwaysOnTop: false, opacity: 1, createdAt: '1', lastActiveAt: '1' }); const pages = new PageRepository(db); const page = { id: 'p', curaId: 'c', url: 'https://example.com', title: 'Example', firstVisit: '1', lastVisit: '1', active: true }; pages.saveContent(page, 'Nexus searchable content'); expect(searchPages(pages, 'c', 'searchable')).toEqual(['p']); db.close() }) })
