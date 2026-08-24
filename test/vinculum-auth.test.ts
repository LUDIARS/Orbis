import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bearerToken, clientIdHeader, createOrLoadToken, hasValidToken, isLoopback } from '../src/main/vinculum/auth.js'

describe('vinculum auth', () => {
  it('creates the token once and reloads the same value', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0003_sigillum.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0004_sigillum_active.sql', 'utf8'))
      const token = createOrLoadToken(db)
      expect(token.length).toBeGreaterThanOrEqual(32)
      expect(createOrLoadToken(db)).toBe(token)
    } finally { db.close() }
  })

  it('rotates a malformed stored token instead of accepting weak authentication', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec(readFileSync('src/main/tabularium/migrations/0001_init.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0002_product_facts.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0003_sigillum.sql', 'utf8'))
      db.exec(readFileSync('src/main/tabularium/migrations/0004_sigillum_active.sql', 'utf8'))
      db.prepare("INSERT INTO vinculum_config (key, value) VALUES ('token', 'weak')").run()
      const token = createOrLoadToken(db)
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(token).not.toBe('weak')
    } finally { db.close() }
  })

  it('rejects missing, wrong, and different-length tokens', () => {
    expect(hasValidToken(undefined, 'secret')).toBe(false)
    expect(hasValidToken('secret', 'secret')).toBe(true)
    expect(hasValidToken('Secret', 'secret')).toBe(false)
    expect(hasValidToken('secret-longer', 'secret')).toBe(false)
  })

  it('accepts only the exact Bearer authorization scheme', () => {
    const token = 'a'.repeat(43)
    expect(bearerToken(`Bearer ${token}`)).toBe(token)
    expect(bearerToken(token)).toBeUndefined()
    expect(bearerToken(`Basic ${token}`)).toBeUndefined()
    expect(bearerToken(`Bearer  ${token}`)).toBeUndefined()
    expect(bearerToken(`Bearer ${token} trailing`)).toBeUndefined()
  })

  it('accepts only bounded client identifiers with a log-safe syntax', () => {
    expect(clientIdHeader('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(clientIdHeader('')).toBeUndefined()
    expect(clientIdHeader('contains spaces')).toBeUndefined()
    expect(clientIdHeader(['duplicate', 'headers'])).toBeUndefined()
    expect(clientIdHeader('a'.repeat(129))).toBeUndefined()
  })

  it('accepts only loopback addresses', () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopback('192.168.0.10')).toBe(false)
    expect(isLoopback(undefined)).toBe(false)
  })
})
