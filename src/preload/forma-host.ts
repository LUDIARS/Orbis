import { ipcRenderer } from 'electron'
import { amazonSelectors } from '../main/forma/sites/amazon/selectors.js'
import { extractAmazonFacts } from '../main/forma/sites/amazon/facts-extractor.js'

const text = (selector: string): string | null => document.querySelector(selector)?.textContent ?? null

function mountAmazonFacts(): void {
  const facts = extractAmazonFacts({
    title: text(amazonSelectors.title), price: text(amazonSelectors.price), rating: text(amazonSelectors.rating),
    reviewCount: text(amazonSelectors.reviewCount), delivery: text(amazonSelectors.delivery), url: location.href
  })
  const existing = document.getElementById('orbis-product-facts')
  if (existing) existing.remove()
  const panel = document.createElement('aside')
  panel.id = 'orbis-product-facts'
  panel.textContent = [facts.price, facts.rating, facts.reviewCount, facts.delivery].filter(Boolean).join(' · ')
  const add = document.createElement('button')
  add.type = 'button'; add.textContent = '比較へ追加'
  add.addEventListener('click', () => ipcRenderer.send('orbis:product-facts', facts))
  panel.append(add)
  document.querySelector(amazonSelectors.title)?.parentElement?.append(panel)
}

ipcRenderer.on('orbis:forma-apply', (_event, value: unknown) => {
  if (typeof value === 'object' && value !== null && (value as { id?: unknown }).id === 'amazon') mountAmazonFacts()
})
