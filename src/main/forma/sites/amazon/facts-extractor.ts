export interface ProductFacts { curaId?: string; title: string; price: string | null; rating: string | null; reviewCount: string | null; delivery: string | null; url: string }

export interface AmazonFactSource { title?: string | null; price?: string | null; rating?: string | null; reviewCount?: string | null; delivery?: string | null; url: string }

const normalize = (value: string | null | undefined): string | null => value?.replace(/\s+/g, ' ').trim() || null

/** @implements SPEC-ORBIS-P2-FORMA */
export function extractAmazonFacts(source: AmazonFactSource): ProductFacts {
  return { title: normalize(source.title) ?? 'Amazon product', price: normalize(source.price), rating: normalize(source.rating), reviewCount: normalize(source.reviewCount), delivery: normalize(source.delivery), url: source.url }
}

/** @implements SPEC-ORBIS-P2-FORMA */
const htmlText = (html: string, id: string): string | null => {
  const expression = new RegExp(`<[^>]*id=["']${id}["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i')
  const match = html.match(expression)
  return match ? match[1].replace(/<[^>]+>/g, ' ') : null
}

/** @implements SPEC-ORBIS-P2-FORMA */
export function extractAmazonFactsFromHtml(html: string, url: string): ProductFacts {
  return extractAmazonFacts({ title: htmlText(html, 'productTitle'), price: htmlText(html, 'priceblock_ourprice') ?? htmlText(html, 'priceblock_dealprice'), rating: htmlText(html, 'acrPopover'), reviewCount: htmlText(html, 'acrCustomerReviewText'), delivery: htmlText(html, 'deliveryBlockMessage'), url })
}
