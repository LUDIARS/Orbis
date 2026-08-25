import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { WindowStateRepository } from '../src/main/tabularium/repositories/window-state-repo.js'

describe('window state migration', () => {
  it('adds a separately owned state row for Anulus, Speculum, and page windows', () => {
    const db = new DatabaseSync(':memory:')
    try {
      for (const migration of ['0001_init.sql', '0002_product_facts.sql', '0003_sigillum.sql', '0004_sigillum_active.sql', '0005_window_state.sql']) db.exec(readFileSync(`src/main/tabularium/migrations/${migration}`, 'utf8'))
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'window_state'").get()).toBeTruthy()
      expect(db.prepare("SELECT name FROM pragma_table_info('window_state') ORDER BY cid").all().map((row) => (row as { name: string }).name)).toContain('display_id')
      const repository = new WindowStateRepository(db)
      repository.save({ ownerKind: 'page', ownerId: 'page-1', displayId: '42', x: 10, y: 20, width: 800, height: 600, visible: true })
      expect(repository.get('page', 'page-1')).toEqual({ ownerKind: 'page', ownerId: 'page-1', displayId: '42', x: 10, y: 20, width: 800, height: 600, visible: true })
    } finally { db.close() }
  })
})
