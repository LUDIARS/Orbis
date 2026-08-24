import { randomBytes, timingSafeEqual } from 'node:crypto'
import type { DatabaseSync } from 'node:sqlite'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/
const CLIENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/

export function createOrLoadToken(db: DatabaseSync): string {
  const stored = db.prepare("SELECT value FROM vinculum_config WHERE key = 'token'").get() as { value?: string } | undefined
  if (stored?.value && TOKEN_PATTERN.test(stored.value)) return stored.value
  const token = randomBytes(32).toString('base64url')
  db.prepare(
    "INSERT INTO vinculum_config (key, value) VALUES ('token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
  ).run(token)
  return token
}

export function isLoopback(address: string | undefined): boolean { return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1' }
export function bearerToken(authorization: string | undefined): string | undefined {
  const match = authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)
  return match?.[1]
}
export function clientIdHeader(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && CLIENT_ID_PATTERN.test(value) ? value : undefined
}
export function hasValidToken(actual: string | undefined, expected: string): boolean {
  if (!actual) return false
  const left = Buffer.from(actual)
  const right = Buffer.from(expected)
  return left.length === right.length && timingSafeEqual(left, right)
}
