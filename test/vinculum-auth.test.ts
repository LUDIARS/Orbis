import { DatabaseSync } from 'node:sqlite'
import { describe, expect, it } from 'vitest'
import { bearerToken, clientIdHeader, readToken, hasValidToken, instanceIdHeader, isLoopback } from '../src/main/vinculum/auth.js'

describe('vinculum auth', () => {
  it('reads only the environment token and leaves legacy DB rows untouched', () => {
    const db = new DatabaseSync(':memory:')
    try {
      db.exec("CREATE TABLE vinculum_config (key TEXT PRIMARY KEY, value TEXT)")
      db.exec("INSERT INTO vinculum_config VALUES ('token', 'legacy')")
      expect(readToken({ ORBIS_VINCULUM_TOKEN: 'a'.repeat(43) })).toBe('a'.repeat(43))
      expect(() => readToken({})).toThrow('ORBIS_VINCULUM_TOKEN is required.')
      expect(db.prepare("SELECT value FROM vinculum_config WHERE key = 'token'").get()).toEqual({ value: 'legacy' })
    } finally { db.close() }
  })

  it.each(['', 'weak', 'a'.repeat(42), 'a'.repeat(44), 'a'.repeat(43) + '\n', '+'.repeat(43), ' '.repeat(43)])('rejects malformed tokens without exposing values %#', (token) => {
    expect(() => readToken({ ORBIS_VINCULUM_TOKEN: token })).toThrow(/^ORBIS_VINCULUM_TOKEN (is required|must be 43 base64url characters)\.$/)
  })

  it('rejects missing, wrong, and different-length tokens', () => {
    expect(hasValidToken(undefined, 'secret')).toBe(false)
    expect(hasValidToken('secret', 'secret')).toBe(true)
    expect(hasValidToken('Secret', 'secret')).toBe(false)
    expect(hasValidToken('secret-longer', 'secret')).toBe(false)
  })

  it('never falls back to the AI-only token', () => {
    expect(() => readToken({ ORBIS_AI_CC_TOKEN: 'b'.repeat(43) })).toThrow('ORBIS_VINCULUM_TOKEN is required.')
    expect(readToken({ ORBIS_VINCULUM_TOKEN: 'a'.repeat(43), ORBIS_AI_CC_TOKEN: 'b'.repeat(43) })).toBe('a'.repeat(43))
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

  it('accepts only bounded instance identifiers with a header-safe syntax', () => {
    expect(instanceIdHeader('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(instanceIdHeader('')).toBeUndefined()
    expect(instanceIdHeader('contains spaces')).toBeUndefined()
    expect(instanceIdHeader(['duplicate', 'headers'])).toBeUndefined()
    expect(instanceIdHeader('a'.repeat(129))).toBeUndefined()
  })

  it('accepts only loopback addresses', () => {
    expect(isLoopback('127.0.0.1')).toBe(true)
    expect(isLoopback('::1')).toBe(true)
    expect(isLoopback('::ffff:127.0.0.1')).toBe(true)
    expect(isLoopback('192.168.0.10')).toBe(false)
    expect(isLoopback(undefined)).toBe(false)
  })
})
