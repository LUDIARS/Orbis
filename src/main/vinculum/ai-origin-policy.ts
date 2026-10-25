/** @implements SPEC-ORBIS-AI-ONLY Immutable deployment-owned network boundary. */
export class AiOriginPolicy {
  private readonly origins: ReadonlySet<string>

  constructor(values: unknown) {
    if (!Array.isArray(values) || values.length === 0 || values.length > 256) {
      throw new Error('AI mode requires a nonempty LUDIARS origin allowlist (maximum 256).')
    }
    this.origins = new Set(values.map((value: unknown) => {
      if (typeof value !== 'string') throw new Error('AI origins must be strings.')
      const url = new URL(value)
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback))
        || url.username || url.password || url.pathname !== '/' || url.search || url.hash
        || url.hostname.includes('*') || url.hostname.endsWith('.')) {
        throw new Error('AI origins must be exact HTTPS or loopback HTTP service origins.')
      }
      return url.origin
    }))
  }

  allows(value: string): boolean {
    try {
      const url = new URL(value)
      if (url.username || url.password) return false
      // WebSocket access uses the same host/port boundary as the corresponding HTTP service.
      if (url.protocol === 'wss:') url.protocol = 'https:'
      else if (url.protocol === 'ws:') url.protocol = 'http:'
      if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
      return this.origins.has(url.origin)
    } catch { return false }
  }

  requireNavigation(value: string): string {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || !this.allows(value)) {
      throw new Error('AI mode only permits configured LUDIARS service origins.')
    }
    return url.href
  }
}
