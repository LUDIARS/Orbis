import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SigillumService } from '../src/main/sigillum/service.js'
import { createUlid } from '../src/main/sigillum/ulid.js'

const openDb = (): DatabaseSync => {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
  db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8'))
  db.exec(readFileSync('src/main/tabularium/migrations/0003_sigillum.sql', 'utf8'))
  db.exec(readFileSync('src/main/tabularium/migrations/0004_sigillum_active.sql', 'utf8'))
  return db
}

describe('sigillum service', () => {
  it('issues ob_<cura>_<ulid> identifiers', () => {
    const db = openDb()
    try {
      const sigillum = new SigillumService(db).issue('browser', 'cura-1234', null)
      expect(sigillum).toMatch(/^ob_cura1234_[0-9A-HJKMNP-TV-Z]{26}$/)
    } finally { db.close() }
  })

  it('keeps the page sigillum stable across forPage calls', () => {
    const db = openDb()
    try {
      const service = new SigillumService(db)
      const first = service.forPage('cura', 'page-1')
      expect(service.forPage('cura', 'page-1')).toBe(first)
      expect(service.forPage('cura', 'page-2')).not.toBe(first)
    } finally { db.close() }
  })

  it('tracks attach and detach per client', () => {
    const db = openDb()
    try {
      const service = new SigillumService(db)
      const sigillum = service.issue('browser', 'cura', null)
      expect(service.attach('unknown', 'cc-1')).toBe(false)
      expect(service.attach(sigillum, 'cc-1')).toBe(true)
      expect(service.isAttached(sigillum, 'cc-1')).toBe(true)
      expect(service.attach(sigillum, 'cc-2')).toBe(false)
      expect(service.isAttached(sigillum, 'cc-2')).toBe(false)
      service.detach(sigillum)
      expect(service.isAttached(sigillum, 'cc-1')).toBe(false)
    } finally { db.close() }
  })

  it('revokes seals when their process or view ends', () => {
    const db = openDb()
    try {
      const service = new SigillumService(db)
      const browser = service.issue('browser', 'cura', null)
      const page = service.forPage('cura', 'page-1')
      service.revokePage('cura', 'page-1')
      expect(service.attach(page, 'cc-1')).toBe(false)
      expect(service.forPage('cura', 'page-1')).not.toBe(page)
      service.revokeAll()
      expect(service.attach(browser, 'cc-1')).toBe(false)
    } finally { db.close() }
  })
})

describe('ulid', () => {
  it('is 26 chars of Crockford base32 and time-ordered', () => {
    const early = createUlid(1_000_000)
    const late = createUlid(2_000_000)
    expect(early).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/)
    expect(early < late).toBe(true)
  })
})
