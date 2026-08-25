import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import type { AuditLog } from '../src/main/vinculum/audit.js'
import { auditPageEvents } from '../src/main/vinculum/page-audit.js'

interface RecordedEvent { sigillum: string; actor: string; kind: string; payload: unknown }

describe('Vinculum page audit', () => {
  it('records the actual navigation status and skips duplicate/static URLs', () => {
    const emitter = new EventEmitter()
    const records: RecordedEvent[] = []
    const audit = {
      record: (sigillum: string, actor: string, kind: string, payload: unknown) => records.push({ sigillum, actor, kind, payload })
    } as unknown as AuditLog
    auditPageEvents(emitter as unknown as WebContents, 'page-sigillum', audit)

    emitter.emit('did-navigate', {}, 'https://example.com/report?private=value', 204)
    emitter.emit('did-navigate', {}, 'https://example.com/report?private=value', 204)
    emitter.emit('did-navigate', {}, 'https://example.com/app.js', 200)

    expect(records).toEqual([{
      sigillum: 'page-sigillum',
      actor: 'page',
      kind: 'network',
      payload: { status: 204, url: 'https://example.com/report?private=value', ms: 0 }
    }])
  })
})
