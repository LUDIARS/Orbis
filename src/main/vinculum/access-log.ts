import type { DatabaseSync } from 'node:sqlite'
import type { PeerVerdict } from './peer-verification.js'

const MAX_ACCESS_LOG_ENTRIES = 10_000

/**
 * 接続の可否そのものを残す。 sigillum_log は sigillum への外部キーを持つので、
 * まだ sigillum を持たない「接続を拒否した」記録はそちらへ入れられない。
 *
 * 残すのは判定結果と理由だけで、提示された instance_id やトークンは残さない。
 * 拒否理由を突き合わせるのに値そのものは要らず、監査ログに置けば漏洩面が増える。
 */
/** @implements SPEC-ORBIS-P6-VINCULUM-PEER */
export class VinculumAccessLog {
  /** @implements SPEC-ORBIS-P6-VINCULUM-PEER */
  constructor(private readonly db: DatabaseSync) {}

  /** @implements SPEC-ORBIS-P6-VINCULUM-PEER */
  record(verdict: PeerVerdict, clientId?: string): void {
    this.db.prepare('INSERT INTO vinculum_access_log (at, allowed, enforced, reason, client_id) VALUES (?, ?, ?, ?, ?)')
      .run(new Date().toISOString(), verdict.allowed ? 1 : 0, verdict.enforced ? 1 : 0, verdict.reason, clientId ?? null)
    // 認証前の loopback リクエストも記録するため、ローカルプロセスによる連打で
    // DB が無制限に増えないよう、運用確認に十分な直近分だけを保持する。
    this.db.prepare(`DELETE FROM vinculum_access_log WHERE id NOT IN (
      SELECT id FROM vinculum_access_log ORDER BY id DESC LIMIT ?
    )`).run(MAX_ACCESS_LOG_ENTRIES)
  }
}
