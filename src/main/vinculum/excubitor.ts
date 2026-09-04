/**
 * Excubitor (サービス監視・起動制御) の最小クライアント。
 *
 * Vinculum が「接続元が Excubitor 管理下の Concordia か」を照合するためだけに使う。
 * Orbis がサービスを起動・停止することは無いので、参照系 1 本しか持たない。
 *
 * **prefix は `/api/v1/`**。`/v1/` と `/api/` は 404 になる (2026-09-04 実測)。
 *
 * 接続先は Excubitor / ProcessMap 側から環境変数で受け取る。ポートをここに複製すると
 * catalog の変更時に古い private endpoint へ接続し続けるため、既定値は持たない。
 */

/** Excubitor `GET /api/v1/services/<code>` の、照合に使う部分だけ。 */
export interface ExcubitorServiceDetail {
  state?: string | null
  instance_id?: string | null
}

const DEFAULT_TIMEOUT_MS = 3_000

/** @implements SPEC-ORBIS-P6-VINCULUM-PEER */
function normalizeExcubitorOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if ((url.protocol !== 'http:' && url.protocol !== 'https:') || url.username || url.password) return undefined
    if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) return undefined
    return url.origin
  } catch {
    // An invalid endpoint is indistinguishable from an unavailable Excubitor and fails closed when enforced.
    return undefined
  }
}

/** @implements SPEC-ORBIS-P6-VINCULUM-PEER */
export function excubitorBaseUrl(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = env.ORBIS_EXCUBITOR_URL?.trim() || env.EXCUBITOR_URL?.trim()
  return normalizeExcubitorOrigin(value)
}

export interface ServiceDetailOptions {
  baseUrl?: string
  timeoutMs?: number
  fetchImpl?: typeof fetch
}

/**
 * 照合できないことと「照合したうえで不一致」は呼び出し側で区別が要るので、
 * 到達できなければ例外ではなく null を返す。 どちらも拒否に倒すが、
 * 監査ログに残す理由が変わる。
 * @implements SPEC-ORBIS-P6-VINCULUM-PEER
 */
export async function fetchServiceDetail(
  code: string,
  { baseUrl = excubitorBaseUrl(), timeoutMs = DEFAULT_TIMEOUT_MS, fetchImpl = fetch }: ServiceDetailOptions = {}
): Promise<ExcubitorServiceDetail | null> {
  const origin = normalizeExcubitorOrigin(baseUrl)
  if (!origin) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetchImpl(`${origin}/api/v1/services/${encodeURIComponent(code)}`, {
      signal: controller.signal,
      // Excubitor の照合を別 origin の応答で成立させない。
      redirect: 'error',
      headers: { accept: 'application/json' }
    })
    if (!response.ok) return null
    const body: unknown = await response.json()
    if (typeof body !== 'object' || body === null) return null
    const detail = body as { service?: unknown } & ExcubitorServiceDetail
    // 応答が {service: {...}} で包まれる版と素の版の両方を受ける。
    const source = (typeof detail.service === 'object' && detail.service !== null ? detail.service : detail) as ExcubitorServiceDetail
    return { state: typeof source.state === 'string' ? source.state : null, instance_id: typeof source.instance_id === 'string' ? source.instance_id : null }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
