/**
 * 入力欄に打たれた 1 行を「URL として開く」か「検索する」かに振り分ける純粋ロジック。
 * 判定は main / renderer の両方から使うので shared に置く。
 */

/** 自動判定 (auto) のほか、ユーザがボタンで固定した場合の url / search を持つ。 */
export type NavigationMode = 'auto' | 'url' | 'search'

export const navigationModes: readonly NavigationMode[] = ['auto', 'url', 'search']

export function isNavigationMode(value: unknown): value is NavigationMode {
  return typeof value === 'string' && (navigationModes as readonly string[]).includes(value)
}

/** navigation-url 境界で許可される明示 HTTP(S) スキーム。 */
const EXPLICIT_SCHEME = /^https?:\/\//i
/** スキーム省略の host[:port][/path]。TLD らしさ (英字 2 文字以上) を要求する。 */
const BARE_HOST = /^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(:\d{1,5})?([/?#].*)?$/i
/** localhost / IPv4 は TLD を持たないので個別に許す。 */
const LOCAL_HOST = /^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d{1,5})?([/?#].*)?$/i

/**
 * 自動判定。 迷ったら検索に倒す — 打ち間違いを URL として開くより、
 * 検索結果を見せる方が取り返しがつく。
 */
export function looksLikeUrl(input: string): boolean {
  const value = input.trim()
  if (!value || /\s/.test(value)) return false
  if (EXPLICIT_SCHEME.test(value)) return true
  // 「?」で始まる入力は検索の明示指定として扱う (アドレスバーの慣習)。
  if (value.startsWith('?')) return false
  return BARE_HOST.test(value) || LOCAL_HOST.test(value)
}

export interface NavigationTarget {
  kind: 'url' | 'search'
  /** kind=url なら開く文字列、kind=search なら検索語。 */
  value: string
}

/** モードを適用して、実際に何をするかを決める。空入力は null。 */
export function resolveNavigationTarget(input: string, mode: NavigationMode = 'auto'): NavigationTarget | null {
  const value = input.trim()
  if (!value) return null
  if (mode === 'url') return { kind: 'url', value }
  const searchValue = value.replace(/^\?\s*/, '')
  if (mode === 'search') return searchValue ? { kind: 'search', value: searchValue } : null
  return looksLikeUrl(value)
    ? { kind: 'url', value }
    : searchValue ? { kind: 'search', value: searchValue } : null
}
