/** @implements SPEC-ORBIS-P6-EXPLORATIO 検索エンジン URL の組み立ては Forma 側に 1 箇所だけ置く。 */
export function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`
}
