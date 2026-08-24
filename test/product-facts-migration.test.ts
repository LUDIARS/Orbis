import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('product facts migration', () => {
  it('creates the product_facts table as migration 0002', () => {
    const db = new DatabaseSync(':memory:'); try { db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8')); db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8')); expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'product_facts'").get()).toBeTruthy() } finally { db.close() }
  })
})
