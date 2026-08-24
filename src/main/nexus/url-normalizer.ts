const TRACKING_PARAMETERS = new Set(['fbclid', 'gclid', 'mc_cid', 'mc_eid'])

/** @implements SPEC-ORBIS-P1-NEXUS */
export function normalizeUrl(value: string): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  url.username = ''
  url.password = ''
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || TRACKING_PARAMETERS.has(key)) url.searchParams.delete(key)
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString()
}

/** @implements SPEC-ORBIS-P1-NEXUS */
export function normalizeGraphUrl(value: string): string {
  const normalized = normalizeUrl(value)
  if (!normalized) throw new TypeError('A valid HTTP or HTTPS URL is required.')
  return normalized
}
