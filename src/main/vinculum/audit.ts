import type { DatabaseSync } from 'node:sqlite'

const REDACTED = '[redacted]'
const sensitiveKeys = new Set(['authorization', 'base64', 'body', 'content', 'cookie', 'credentials', 'html', 'password', 'payload', 'secret', 'set-cookie', 'text', 'token', 'transcript'])

/** @implements SPEC-ORBIS-P5-AUDIT Persist only bounded, non-secret operation metadata. */
function auditValue(key: string, value: unknown): unknown {
  const normalizedKey = key.toLowerCase()
  if (sensitiveKeys.has(normalizedKey) || normalizedKey.includes('sigillum')) return REDACTED
  if ((normalizedKey === 'url' || normalizedKey === 'navigated') && typeof value === 'string') {
    try {
      const url = new URL(value)
      url.username = ''
      url.password = ''
      url.search = ''
      url.hash = ''
      return url.toString()
    } catch {
      return REDACTED
    }
  }
  return typeof value === 'string' && value.length > 512 ? `${value.slice(0, 512)}…` : value
}

export function summarizePayload(payload: unknown): string {
  const text = JSON.stringify(payload, auditValue) ?? 'null'
  return text.length <= 2048 ? text : `${text.slice(0, 2048)}…`
}

/** @implements SPEC-ORBIS-P5-AUDIT */
export class AuditLog {
  constructor(private readonly db: DatabaseSync) {}
  record(sigillum: string, actor: string, kind: string, payload: unknown): void {
    this.db.prepare('INSERT INTO sigillum_log (sigillum, at, actor, kind, payload) VALUES (?, ?, ?, ?, ?)')
      .run(sigillum, new Date().toISOString(), actor, kind, summarizePayload(payload))
  }
  list(sigillum: string, since?: string): unknown[] {
    const query = since
      ? 'SELECT at, actor, kind, payload FROM sigillum_log WHERE sigillum = ? AND at >= ? ORDER BY at'
      : 'SELECT at, actor, kind, payload FROM sigillum_log WHERE sigillum = ? ORDER BY at'
    return (since ? this.db.prepare(query).all(sigillum, since) : this.db.prepare(query).all(sigillum)) as unknown[]
  }
}
