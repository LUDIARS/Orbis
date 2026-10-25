import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { SigillumService } from '../src/main/sigillum/service.js'
import { VinculumServer } from '../src/main/vinculum/server.js'
import { AuditLog } from '../src/main/vinculum/audit.js'
import { VinculumAccessLog } from '../src/main/vinculum/access-log.js'
import type { VinculumOperations } from '../src/main/vinculum/operations.js'

describe('AI mode HTTP authorization', () => {
  it('requires the dedicated token, client, and live Cc instance even when the normal switch is off', async () => {
    const db = new DatabaseSync(':memory:')
    const directory = await mkdtemp(join(tmpdir(), 'orbis-ai-auth-'))
    const migrationDir = 'src/main/tabularium/migrations'
    for (const name of readdirSync(migrationDir).filter((name) => name.endsWith('.sql')).sort()) {
      db.exec(readFileSync(join(migrationDir, name), 'utf8'))
    }
    const seals = new SigillumService(db)
    const sigillum = seals.issue('browser', 'ai-test', null)
    const token = 'a'.repeat(43)
    let available = true
    const verify = vi.fn(async () => {
      if (!available) throw new Error('offline')
      return new Response(JSON.stringify({ state: 'running', instance_id: 'cc-instance' }))
    })
    const operations: VinculumOperations = {
      navigate: vi.fn(), open: vi.fn(), read: vi.fn(), act: vi.fn(),
      search: vi.fn(), toMemoria: vi.fn(), reveal: vi.fn()
    }
    const server = new VinculumServer(token, seals, new AuditLog(db), operations,
      new VinculumAccessLog(db), () => false,
      { baseUrl: 'http://excubitor.test', fetchImpl: verify as typeof fetch }, { browserSigillum: sigillum })
    try {
      const port = await server.start(directory)
      const call = async (overrides: Record<string, string | undefined> = {}) => {
        const headers: Record<string, string | undefined> = {
          authorization: `Bearer ${token}`, 'x-orbis-client-id': 'cc-client',
          'x-orbis-instance-id': 'cc-instance', 'content-type': 'application/json',
          accept: 'application/json, text/event-stream', ...overrides
        }
        const response = await fetch(`http://127.0.0.1:${port}`, {
          method: 'POST', headers: Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== undefined)),
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' })
        })
        await response.text()
        return response.status
      }
      expect(await call({ authorization: `Bearer ${'b'.repeat(43)}` })).toBe(401)
      expect(await call({ origin: 'https://cc.ai-run-do.com' })).toBe(401)
      expect(await call({ 'x-orbis-client-id': undefined })).toBe(401)
      expect(verify).not.toHaveBeenCalled()
      expect(await call({ 'x-orbis-instance-id': undefined })).toBe(401)
      expect(await call({ 'x-orbis-instance-id': 'other' })).toBe(401)
      expect(await call()).toBe(200)
      available = false
      expect(await call()).toBe(401)
      const discovery = JSON.parse(await readFile(join(directory, 'vinculum.json'), 'utf8'))
      expect(discovery).toEqual({ port, mode: 'ai-only', browserSigillum: sigillum })
      expect(JSON.stringify(discovery)).not.toContain(token)
    } finally {
      await server.stop()
      db.close()
      await rm(directory, { recursive: true, force: true })
    }
  })
})
