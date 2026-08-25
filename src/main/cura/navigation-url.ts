const MAX_URL_LENGTH = 8_192
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]'])
const PRIVATE_HOST_SUFFIXES = ['.localhost', '.local', '.internal', '.home.arpa']

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

/** @implements SPEC-ORBIS-P6-EXPLORATIO Classify IPv4 literals without a DNS lookup or network side effect. */
function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split('.').map(Number)
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return false
  const [first, second] = octets
  return first === 0
    || first === 10
    || first === 127
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && second === 168)
    || (first === 198 && (second === 18 || second === 19))
    || first >= 224
}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Classify IPv6 literals conservatively, including mapped addresses. */
function isPrivateIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase()
  return normalized === '::'
    || normalized === '::1'
    || normalized.startsWith('fc')
    || normalized.startsWith('fd')
    || /^fe[89a-f]/.test(normalized)
    || normalized.startsWith('::ffff:')
}

/** @implements SPEC-ORBIS-P6-EXPLORATIO Prevent automated result traversal into obvious local/private services. */
export function isAllowedExplorationUrl(value: string): boolean {
  try {
    const parsed = new URL(normalizeNavigationUrl(value))
    // A trailing root label is equivalent in DNS (for example localhost.), so
    // classify the canonical host rather than allowing it to bypass suffix checks.
    const hostname = parsed.hostname.toLowerCase().replace(/\.+$/, '')
    if (LOOPBACK_HOSTS.has(hostname) || PRIVATE_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return false
    if (isPrivateIpv4(hostname) || (hostname.includes(':') && isPrivateIpv6(hostname))) return false
    return parsed.port === ''
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
