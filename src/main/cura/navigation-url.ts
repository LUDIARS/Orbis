const MAX_URL_LENGTH = 8_192
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])

/** @implements SPEC-ORBIS-P0-NAVIGATION */
export function normalizeNavigationUrl(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) throw new TypeError('A URL is required.')
  if (trimmed.length > MAX_URL_LENGTH) throw new TypeError('The URL is too long.')

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  let parsed: URL
  try {
    parsed = new URL(candidate)
  } catch {
    throw new TypeError('The URL is invalid.')
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new TypeError(`Unsupported URL protocol: ${parsed.protocol}`)
  }
  if (parsed.username || parsed.password) {
    throw new TypeError('Credentials in URLs are not supported.')
  }
  return parsed.href
}

export function isAllowedNavigationUrl(value: string): boolean {
  try {
    normalizeNavigationUrl(value)
    return true
  } catch {
    return false
  }
}

export function normalizeDevelopmentRendererUrl(value: string): string {
  const normalized = normalizeNavigationUrl(value)
  const parsed = new URL(normalized)
  if (!LOOPBACK_HOSTS.has(parsed.hostname)) {
    throw new TypeError('The development renderer must use a loopback URL.')
  }
  return parsed.href
}
