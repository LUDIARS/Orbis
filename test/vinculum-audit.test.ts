import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SigillumService } from '../src/main/sigillum/service.js'
import { AuditLog, summarizePayload } from '../src/main/vinculum/audit.js'

describe('vinculum audit log', () => {
  it('records actor-tagged entries and filters by since', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0003_sigillum.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0004_sigillum_active.sql', 'utf8'))
      const sigillum = new SigillumService(db).issue('page', 'cura', 'page-1')
      const audit = new AuditLog(db)
      audit.record(sigillum, 'cc:client', 'navigate', { url: 'https://example.com' })
      audit.record(sigillum, 'user', 'reveal', { pageId: 'page-1' })
      const all = audit.list(sigillum) as { actor: string; kind: string }[]
      expect(all).toHaveLength(2)
      expect(all.map((entry) => entry.actor)).toEqual(['cc:client', 'user'])
      const future = audit.list(sigillum, '9999-01-01T00:00:00.000Z')
      expect(future).toHaveLength(0)
    } finally { db.close() }
  })

  it('truncates long payload values in the summary', () => {
    const summary = summarizePayload({ description: 'a'.repeat(4096) })
    expect(summary.length).toBeLessThanOrEqual(2049)
    expect(summary).toContain('…')
  })

  it('redacts page bodies, screenshots, credentials, and nested log payloads', () => {
    const summary = summarizePayload({
      text: 'private page',
      html: '<p>private</p>',
      base64: 'image',
      token: 'secret',
      pageSigillum: 'capability',
      nested: { payload: 'previous audit data' }
    })
    expect(summary).not.toContain('private')
    expect(summary).not.toContain('image')
    expect(summary).not.toContain('secret')
    expect(summary).not.toContain('capability')
    expect(summary).not.toContain('previous audit data')
  })

  it('removes credentials, query parameters, and fragments from audited URLs', () => {
    const summary = summarizePayload({ url: 'https://user:pass@example.com/path?token=secret#private' })
    expect(summary).toContain('https://example.com/path')
    expect(summary).not.toContain('user')
    expect(summary).not.toContain('secret')
    expect(summary).not.toContain('private')
  })
})
