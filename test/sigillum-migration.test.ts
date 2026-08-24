import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('sigillum migration', () => {
  it('creates the sigillum tables in 0003 and the active flag with the page_content table in 0004', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0003_sigillum.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0004_sigillum_active.sql', 'utf8'))
      for (const table of ['sigillum', 'sigillum_log', 'vinculum_config', 'page_content']) {
        expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?").get(table)).toBeTruthy()
      }
      const columns = db.prepare('PRAGMA table_info(page)').all() as { name: string }[]
      expect(columns.some((column) => column.name === 'umbra')).toBe(true)
      const sigillumColumns = db.prepare('PRAGMA table_info(sigillum)').all() as { name: string }[]
      expect(sigillumColumns.some((column) => column.name === 'active')).toBe(true)
    } finally { db.close() }
  })
})
