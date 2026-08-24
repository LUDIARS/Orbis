import { ipcMain, type IpcMainEvent } from 'electron'
import { channels } from '../channels.js'
import type { ProductFacts } from '../../forma/sites/amazon/facts-extractor.js'

const MAX_URL_LENGTH = 8_192
const MAX_TITLE_LENGTH = 1_024
const MAX_DETAIL_LENGTH = 512

/** @implements SPEC-ORBIS-P2-FORMA */
const isNullableDetail = (value: unknown): value is string | null =>
  value === null || (typeof value === 'string' && value.length <= MAX_DETAIL_LENGTH)

/** @implements SPEC-ORBIS-P2-FORMA */
const isSafeProductUrl = (value: string): boolean => {
  if (value.length > MAX_URL_LENGTH) return false
  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password
  } catch {
    return false
  }
}

/** @implements SPEC-ORBIS-P2-FORMA */
const isProductFacts = (value: unknown): value is ProductFacts => {
  if (!value || typeof value !== 'object') return false
  const facts = value as Record<string, unknown>
  return typeof facts.title === 'string'
    && facts.title.length > 0
    && facts.title.length <= MAX_TITLE_LENGTH
    && typeof facts.url === 'string'
    && isSafeProductUrl(facts.url)
    && ['price', 'rating', 'reviewCount', 'delivery'].every((key) => isNullableDetail(facts[key]))
}

/** @implements SPEC-ORBIS-P2-FORMA */
export function registerProductFactsHandler(save: (senderId: number, facts: ProductFacts) => void): () => void {
  const listener = (event: IpcMainEvent, value: unknown): void => { if (isProductFacts(value)) save(event.sender.id, value) }
  ipcMain.on(channels.productFacts, listener)
  return () => ipcMain.removeListener(channels.productFacts, listener)
}
