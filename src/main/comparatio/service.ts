import type { DatabaseSync } from 'node:sqlite'
import type { ProductFacts } from '../forma/sites/amazon/facts-extractor.js'

export interface StoredProductFacts extends ProductFacts { id: string; curaId: string; addedAt: string }

/** @implements SPEC-ORBIS-P2-COMPARATIO */
export class ComparatioService {
  constructor(private readonly db: DatabaseSync) {}
  upsert(curaId: string, facts: ProductFacts): StoredProductFacts {
    const now = new Date().toISOString(); const id = `${curaId}:${facts.url}`
    this.db.prepare(`INSERT INTO product_facts (id, cura_id, title, price, rating, review_count, delivery, url, added_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(cura_id, url) DO UPDATE SET title=excluded.title, price=excluded.price, rating=excluded.rating, review_count=excluded.review_count, delivery=excluded.delivery, added_at=excluded.added_at`).run(id, curaId, facts.title, facts.price, facts.rating, facts.reviewCount, facts.delivery, facts.url, now)
    return { id, curaId, ...facts, addedAt: now }
  }
  list(curaId: string): StoredProductFacts[] {
    return this.db.prepare('SELECT id, cura_id AS curaId, title, price, rating, review_count AS reviewCount, delivery, url, added_at AS addedAt FROM product_facts WHERE cura_id = ? ORDER BY added_at DESC').all(curaId) as unknown as StoredProductFacts[]
  }
}
