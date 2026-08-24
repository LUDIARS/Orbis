import { describe, expect, it } from 'vitest'
import { extractAmazonFactsFromHtml } from '../src/main/forma/sites/amazon/facts-extractor.js'

describe('extractAmazonFactsFromHtml', () => {
  it('normalizes product facts from fixture HTML', () => {
    const facts = extractAmazonFactsFromHtml('<h1 id="productTitle"> Test Product </h1><span id="priceblock_ourprice"> ¥ 1,200 </span><i id="acrPopover"> 4.5 out of 5 </i><span id="acrCustomerReviewText"> 123 ratings </span><div id="deliveryBlockMessage"> FREE delivery Tomorrow </div>', 'https://www.amazon.co.jp/dp/1')
    expect(facts).toEqual({ title: 'Test Product', price: '¥ 1,200', rating: '4.5 out of 5', reviewCount: '123 ratings', delivery: 'FREE delivery Tomorrow', url: 'https://www.amazon.co.jp/dp/1' })
  })
})
