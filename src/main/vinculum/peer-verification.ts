import type { DatabaseSync } from 'node:sqlite'
import { fetchServiceDetail, type ServiceDetailOptions } from './excubitor.js'

/**
 * 設計書 §7.3 R12 の 3 本目: 「接続元プロセスが Excubitor 管理下の Concordia
 * であることを Excubitor `service_detail` で照合 (照合不能なら拒否)」。
 *
 * **既定は OFF** (neco 判断 2026-09-04)。 照合には Cc が自分の Excubitor
 * instance_id を提示する必要があり、それは Cc 側の変更で入る。 先に fail-closed
 * を既定にすると、まだ名乗っていない Cc からの接続が全部 401 になって
 * Cc ↔ Orbis のリンクが切れる。 Cc 側が入ったら設定で ON にする。
 *
 * ON のときは **照合不能も拒否**する。 Excubitor が落ちている・応答しない・
 * instance_id を持たない、のいずれも「Excubitor 管理下であることを確認できない」
 * であって、確認できないものを通すならこの照合を入れる意味が無い。
 */

const CONFIG_KEY = 'excubitor_verification'
const CONCORDIA_SERVICE_CODE = 'concordia'

export type PeerVerificationReason =
  // 照合以前に落ちた分。 Excubitor 照合とは別の理由だが、
  // 「なぜ接続が通らなかったか」を 1 か所で読めないと運用で追えない。
  | 'not-loopback'
  | 'invalid-token'
  | 'verification-config-unavailable'
  | 'disabled'
  | 'missing-instance-id'
  | 'excubitor-unreachable'
  | 'concordia-not-running'
  | 'instance-id-unavailable'
  | 'instance-id-mismatch'
  | 'verified'

export interface PeerVerdict {
  allowed: boolean
  reason: PeerVerificationReason
  /** 照合が有効だったか。 false なら allowed は「素通し」であって「確認済み」ではない。 */
  enforced: boolean
}

/**
 * @implements SPEC-ORBIS-P6-VINCULUM-PEER
 * 値が無い / 'on' 以外は無効。 未設定のインストールが黙って fail-closed にならないようにする。
 */
export function verificationEnabled(db: DatabaseSync): boolean {
  const row = db.prepare('SELECT value FROM vinculum_config WHERE key = ?').get(CONFIG_KEY) as { value?: string } | undefined
  return row?.value === 'on'
}

export interface VerifyPeerOptions extends ServiceDetailOptions {
  serviceCode?: string
}

/**
 * @implements SPEC-ORBIS-P6-VINCULUM-PEER
 * 接続元が名乗った instance_id を Excubitor の Concordia 記録と突き合わせる。
 * 照合が無効なら Excubitor を呼ばない (停止していても Vinculum が使える)。
 */
export async function verifyConcordiaPeer(
  enabled: boolean,
  instanceId: string | undefined,
  { serviceCode = CONCORDIA_SERVICE_CODE, ...options }: VerifyPeerOptions = {}
): Promise<PeerVerdict> {
  if (!enabled) return { allowed: true, reason: 'disabled', enforced: false }
  if (!instanceId) return { allowed: false, reason: 'missing-instance-id', enforced: true }
  const detail = await fetchServiceDetail(serviceCode, options)
  if (!detail) return { allowed: false, reason: 'excubitor-unreachable', enforced: true }
  if (detail.state !== 'running') return { allowed: false, reason: 'concordia-not-running', enforced: true }
  if (!detail.instance_id) return { allowed: false, reason: 'instance-id-unavailable', enforced: true }
  if (detail.instance_id !== instanceId) return { allowed: false, reason: 'instance-id-mismatch', enforced: true }
  return { allowed: true, reason: 'verified', enforced: true }
}
