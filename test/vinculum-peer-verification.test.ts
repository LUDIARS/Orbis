import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { VinculumAccessLog } from '../src/main/vinculum/access-log.js'
import { excubitorBaseUrl, fetchServiceDetail } from '../src/main/vinculum/excubitor.js'
import {
  verificationEnabled,
  verifyConcordiaPeer
} from '../src/main/vinculum/peer-verification.js'

const MIGRATIONS = [
  '0001_init.sql',
  '0002_product_facts.sql',
  '0003_sigillum.sql',
  '0004_sigillum_active.sql',
  '0005_window_state.sql',
  '0006_vitrum.sql',
  '0007_vinculum_access.sql'
]

function openDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:')
  for (const name of MIGRATIONS) db.exec(readFileSync(`src/main/tabularium/migrations/${name}`, 'utf8'))
  return db
}

const running = (instanceId: string) =>
  (async () => new Response(JSON.stringify({ state: 'running', instance_id: instanceId }), { status: 200 })) as unknown as typeof fetch

const EXCUBITOR_BASE_URL = 'http://excubitor.test'

describe('vinculum peer verification', () => {
  it('defaults to off so an installation without the Cc-side change keeps working', () => {
    const db = openDb()
    try {
      expect(verificationEnabled(db)).toBe(false)
      db.prepare("INSERT INTO vinculum_config (key, value) VALUES ('excubitor_verification', 'on')").run()
      expect(verificationEnabled(db)).toBe(true)
      db.prepare("UPDATE vinculum_config SET value = 'off' WHERE key = 'excubitor_verification'").run()
      expect(verificationEnabled(db)).toBe(false)
    } finally { db.close() }
  })

  it('treats any value other than "on" as off rather than failing closed', () => {
    const db = openDb()
    try {
      db.prepare("INSERT INTO vinculum_config (key, value) VALUES ('excubitor_verification', 'true')").run()
      expect(verificationEnabled(db)).toBe(false)
    } finally { db.close() }
  })

  it('allows without contacting Excubitor while disabled', async () => {
    let called = false
    const fetchImpl = (async () => { called = true; return new Response('{}', { status: 200 }) }) as unknown as typeof fetch
    const verdict = await verifyConcordiaPeer(false, undefined, { fetchImpl })
    expect(verdict).toEqual({ allowed: true, reason: 'disabled', enforced: false })
    expect(called).toBe(false)
  })

  it('accepts a caller whose instance id matches the running Concordia', async () => {
    const verdict = await verifyConcordiaPeer(true, 'de77c490', {
      baseUrl: EXCUBITOR_BASE_URL,
      fetchImpl: running('de77c490')
    })
    expect(verdict).toEqual({ allowed: true, reason: 'verified', enforced: true })
  })

  it('rejects a mismatched instance id', async () => {
    const verdict = await verifyConcordiaPeer(true, 'other', {
      baseUrl: EXCUBITOR_BASE_URL,
      fetchImpl: running('de77c490')
    })
    expect(verdict).toEqual({ allowed: false, reason: 'instance-id-mismatch', enforced: true })
  })

  it('rejects a caller that does not name itself', async () => {
    const verdict = await verifyConcordiaPeer(true, undefined, { fetchImpl: running('de77c490') })
    expect(verdict).toEqual({ allowed: false, reason: 'missing-instance-id', enforced: true })
  })

  // 「照合不能なら拒否」(設計 §7.3 R12)。 確認できないものを通すなら照合の意味が無い。
  it('rejects when Excubitor cannot be reached, answers with an error, or has no instance id', async () => {
    const down = (async () => { throw new Error('ECONNREFUSED') }) as unknown as typeof fetch
    expect(await verifyConcordiaPeer(true, 'x', { baseUrl: EXCUBITOR_BASE_URL, fetchImpl: down })).toEqual({
      allowed: false, reason: 'excubitor-unreachable', enforced: true
    })
    const notFound = (async () => new Response('', { status: 404 })) as unknown as typeof fetch
    expect(await verifyConcordiaPeer(true, 'x', { baseUrl: EXCUBITOR_BASE_URL, fetchImpl: notFound })).toEqual({
      allowed: false, reason: 'excubitor-unreachable', enforced: true
    })
    const noInstance = (async () => new Response(JSON.stringify({ state: 'running' }), { status: 200 })) as unknown as typeof fetch
    expect(await verifyConcordiaPeer(true, 'x', { baseUrl: EXCUBITOR_BASE_URL, fetchImpl: noInstance })).toEqual({
      allowed: false, reason: 'instance-id-unavailable', enforced: true
    })
  })

  it('rejects when Excubitor says Concordia is not running', async () => {
    const stopped = (async () => new Response(JSON.stringify({ state: 'stopped', instance_id: 'x' }), { status: 200 })) as unknown as typeof fetch
    expect(await verifyConcordiaPeer(true, 'x', { baseUrl: EXCUBITOR_BASE_URL, fetchImpl: stopped })).toEqual({
      allowed: false, reason: 'concordia-not-running', enforced: true
    })
  })

  it('reads the service detail from the /api/v1 prefix and unwraps a nested payload', async () => {
    const seen: string[] = []
    let redirect: RequestRedirect | undefined
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push(String(url))
      redirect = init?.redirect
      return new Response(JSON.stringify({ service: { state: 'running', instance_id: 'nested' } }), { status: 200 })
    }) as unknown as typeof fetch
    const detail = await fetchServiceDetail('concordia', { baseUrl: 'http://127.0.0.1:17332', fetchImpl })
    expect(detail).toEqual({ state: 'running', instance_id: 'nested' })
    expect(seen).toEqual(['http://127.0.0.1:17332/api/v1/services/concordia'])
    expect(redirect).toBe('error')
  })

  it('does not contact a service when a direct base URL is not a plain HTTP(S) origin', async () => {
    let called = false
    const fetchImpl = (async () => { called = true; return new Response('{}', { status: 200 }) }) as unknown as typeof fetch
    expect(await fetchServiceDetail('concordia', {
      baseUrl: 'http://127.0.0.1:17332/unexpected-path',
      fetchImpl
    })).toBeNull()
    expect(called).toBe(false)
  })

  it('takes a plain Excubitor origin from the environment and rejects ambiguous endpoints', () => {
    expect(excubitorBaseUrl({})).toBeUndefined()
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'http://127.0.0.1:9/' })).toBe('http://127.0.0.1:9')
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'http://a', ORBIS_EXCUBITOR_URL: 'http://b' })).toBe('http://b')
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'not a URL' })).toBeUndefined()
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'file:///tmp/excubitor' })).toBeUndefined()
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'http://user@127.0.0.1:9' })).toBeUndefined()
    expect(excubitorBaseUrl({ EXCUBITOR_URL: 'http://127.0.0.1:9/api?service=concordia' })).toBeUndefined()
  })

  // 新規インストールではなく **既に使われている DB** を上げるほうが危ない。
  // 0007 は追加のみ (CREATE TABLE IF NOT EXISTS + INDEX) なので、v6 まで入れた DB に
  // 後から当てても既存データが残ることを見ておく。
  it('upgrades an existing v6 database without touching the rows already in it', () => {
    const db = new DatabaseSync(':memory:')
    try {
      for (const name of MIGRATIONS.slice(0, 6)) db.exec(readFileSync(`src/main/tabularium/migrations/${name}`, 'utf8'))
      db.prepare("INSERT INTO vinculum_config (key, value) VALUES ('token', 'existing')").run()
      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vinculum_access_log'").get()).toBeFalsy()

      db.exec(readFileSync('src/main/tabularium/migrations/0007_vinculum_access.sql', 'utf8'))

      expect(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'vinculum_access_log'").get()).toBeTruthy()
      expect(db.prepare("SELECT value FROM vinculum_config WHERE key = 'token'").get()).toEqual({ value: 'existing' })
      // 二度当ててもエラーにならない (IF NOT EXISTS)。 昇格が途中で落ちて再実行されても済む。
      db.exec(readFileSync('src/main/tabularium/migrations/0007_vinculum_access.sql', 'utf8'))
      new VinculumAccessLog(db).record({ allowed: true, reason: 'disabled', enforced: false })
      expect(db.prepare('SELECT COUNT(*) AS n FROM vinculum_access_log').get()).toEqual({ n: 1 })
    } finally { db.close() }
  })

  // 拒否が残らないと、照合が効いているのか誰も接続していないだけなのかを区別できない。
  it('records rejections as well as acceptances', () => {
    const db = openDb()
    try {
      const log = new VinculumAccessLog(db)
      log.record({ allowed: false, reason: 'instance-id-mismatch', enforced: true }, 'cc-1')
      log.record({ allowed: true, reason: 'disabled', enforced: false }, undefined)
      const rows = db.prepare(
        'SELECT allowed, enforced, reason, client_id FROM vinculum_access_log ORDER BY at DESC, id DESC'
      ).all() as Array<{ allowed: number; enforced: number; reason: string; client_id: string | null }>
      expect(rows).toHaveLength(2)
      expect(rows.map((row) => row.reason).sort()).toEqual(['disabled', 'instance-id-mismatch'])
      const rejected = rows.find((row) => row.reason === 'instance-id-mismatch')
      expect(rejected).toMatchObject({ allowed: 0, enforced: 1, client_id: 'cc-1' })
    } finally { db.close() }
  })

  it('bounds the access log so unauthenticated requests cannot grow the database indefinitely', () => {
    const db = openDb()
    try {
      db.exec(`WITH RECURSIVE sequence(value) AS (
        SELECT 1 UNION ALL SELECT value + 1 FROM sequence WHERE value < 10000
      ) INSERT INTO vinculum_access_log (at, allowed, enforced, reason, client_id)
        SELECT '2026-01-01T00:00:00.000Z', 0, 1, 'invalid-token', 'seed-' || value FROM sequence`)
      new VinculumAccessLog(db).record({ allowed: true, reason: 'verified', enforced: true }, 'latest')
      const count = db.prepare('SELECT COUNT(*) AS count FROM vinculum_access_log').get() as { count: number }
      const latest = db.prepare('SELECT client_id FROM vinculum_access_log ORDER BY id DESC LIMIT 1').get() as { client_id: string }
      expect(count.count).toBe(10_000)
      expect(latest.client_id).toBe('latest')
    } finally { db.close() }
  })
})
