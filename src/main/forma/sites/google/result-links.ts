/** @implements SPEC-ORBIS-P6-EXPLORATIO Normalize a Google result without coupling extraction policy to Vinculum. */
export function googleResultHref(href: string): string | null {
  try {
    const url = new URL(href, 'https://www.google.com')
    const candidate = url.pathname === '/url' ? url.searchParams.get('q') ?? url.searchParams.get('url') : url.toString()
    if (!candidate) return null
    const target = new URL(candidate)
    return /^https?:$/.test(target.protocol) && !target.username && !target.password ? target.toString() : null
  } catch { return null }
}

export interface GoogleResultLink { url: string; title: string }

/** @implements SPEC-ORBIS-P6-EXPLORATIO Validate and bound result data crossing the page/main-process boundary. */
export function googleResultLinks(value: unknown): GoogleResultLink[] {
  if (!Array.isArray(value)) return []
  const links: GoogleResultLink[] = []
  const seen = new Set<string>()
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue
    const { url, title } = item as { url?: unknown; title?: unknown }
    if (typeof url !== 'string' || typeof title !== 'string') continue
    const normalized = googleResultHref(url)
    const normalizedTitle = title.trim()
    if (!normalized || normalized.length > 2048 || !normalizedTitle || seen.has(normalized)) continue
    seen.add(normalized)
    links.push({ url: normalized, title: normalizedTitle.slice(0, 512) })
  }
  return links
}
