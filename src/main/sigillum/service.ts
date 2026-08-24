import type { DatabaseSync } from 'node:sqlite'
import { createUlid } from './ulid.js'

export type SigillumKind = 'browser' | 'page'
export interface SigillumRecord { sigillum: string; kind: SigillumKind; curaId: string; pageId: string | null; issuedAt: string; attachedTo: string | null; active: boolean }

/** @implements SPEC-ORBIS-P5-SIGILLUM */
export class SigillumService {
  constructor(private readonly db: DatabaseSync) {}

  issue(kind: SigillumKind, curaId: string, pageId: string | null): string {
    const sigillum = `ob_${curaId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${createUlid()}`
    this.db.prepare('INSERT INTO sigillum (sigillum, kind, cura_id, page_id, issued_at) VALUES (?, ?, ?, ?, ?)')
      .run(sigillum, kind, curaId, pageId, new Date().toISOString())
    return sigillum
  }

  get(sigillum: string): SigillumRecord | undefined {
    const row = this.db.prepare('SELECT sigillum, kind, cura_id, page_id, issued_at, attached_to, active FROM sigillum WHERE sigillum = ?').get(sigillum) as Record<string, unknown> | undefined
    if (!row) return undefined
    return { sigillum: row.sigillum as string, kind: row.kind as SigillumKind, curaId: row.cura_id as string, pageId: row.page_id as string | null, issuedAt: row.issued_at as string, attachedTo: row.attached_to as string | null, active: Boolean(row.active) }
  }

  /** pageSigillum は view ごとに安定: 既発行があればそれを返す。 */
  forPage(curaId: string, pageId: string): string {
    const row = this.db.prepare("SELECT sigillum FROM sigillum WHERE kind = 'page' AND cura_id = ? AND page_id = ? AND active = 1 LIMIT 1").get(curaId, pageId) as { sigillum?: string } | undefined
    return row?.sigillum ?? this.issue('page', curaId, pageId)
  }

  /** @implements SPEC-ORBIS-P5-SIGILLUM 新しいプロセスには以前の view の capability を引き継がない。 */
  revokeAll(): void {
    this.db.prepare('UPDATE sigillum SET active = 0, attached_to = NULL WHERE active = 1').run()
  }

  /** @implements SPEC-ORBIS-P5-SIGILLUM WebContentsView の破棄と同時に pageSigillum を無効化する。 */
  revokePage(curaId: string, pageId: string): void {
    this.db.prepare("UPDATE sigillum SET active = 0, attached_to = NULL WHERE kind = 'page' AND cura_id = ? AND page_id = ?").run(curaId, pageId)
  }

  /** @implements SPEC-ORBIS-P5-SIGILLUM Cura ごとの browserSigillum を起動ごとに一つだけ有効にする。 */
  revokeBrowserSigilla(curaId: string): void {
    this.db.prepare("UPDATE sigillum SET active = 0, attached_to = NULL WHERE kind = 'browser' AND cura_id = ?").run(curaId)
  }

  attach(sigillum: string, clientId: string): boolean {
    return Number(this.db.prepare(
      'UPDATE sigillum SET attached_to = ? WHERE sigillum = ? AND active = 1 AND (attached_to IS NULL OR attached_to = ?)'
    ).run(clientId, sigillum, clientId).changes) > 0
  }
  detach(sigillum: string): void { this.db.prepare('UPDATE sigillum SET attached_to = NULL WHERE sigillum = ?').run(sigillum) }
  isAttached(sigillum: string, clientId: string): boolean { const record = this.get(sigillum); return record?.active === true && record.attachedTo === clientId }
}
