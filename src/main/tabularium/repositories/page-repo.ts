import type { DatabaseSync } from 'node:sqlite'

export type NavigationKind = 'navigate' | 'newview' | 'llm' | 'explore'

export interface Page {
  id: string
  curaId: string
  url: string
  title: string
  firstVisit: string
  lastVisit: string
  active: boolean
  umbra: boolean
  content?: string
}

const rowToPage = (row: Record<string, unknown>): Page => ({
  id: row.id as string,
  curaId: row.cura_id as string,
  url: row.url as string,
  title: row.title as string,
  firstVisit: row.first_visit as string,
  lastVisit: row.last_visit as string,
  active: Boolean(row.active),
  umbra: Boolean(row.umbra)
})

/** @implements SPEC-ORBIS-P0-PERSISTENCE */
export class PageRepository {
  constructor(private readonly db: DatabaseSync) {}

  save(page: Page): void {
    const { content: _content, ...row } = page
    this.db
      .prepare(
        `INSERT INTO page (id, cura_id, url, title, first_visit, last_visit, active, umbra)
         VALUES (@id, @curaId, @url, @title, @firstVisit, @lastVisit, @active, @umbra)
         ON CONFLICT(id) DO UPDATE SET url = excluded.url, title = excluded.title,
           last_visit = excluded.last_visit, active = excluded.active, umbra = excluded.umbra`
      )
      .run({ ...row, active: Number(page.active), umbra: Number(page.umbra) })
    this.syncFts(page)
  }

  /** @implements SPEC-ORBIS-P1-NEXUS */
  graphByCura(curaId: string): { nodes: { id: string; url: string; title: string; lastVisit: string; umbra: boolean }[]; edges: { from: string; to: string; kind: NavigationKind; count: number; lastAt: string }[] } {
    const rows = this.db.prepare('SELECT id, url, title, last_visit AS lastVisit, umbra FROM page WHERE cura_id = ? AND active = 1').all(curaId) as { id: string; url: string; title: string; lastVisit: string; umbra: number }[]
    const nodes = rows.map((row) => ({ ...row, umbra: Boolean(row.umbra) }))
    const edges = this.db.prepare('SELECT from_page_id AS "from", to_page_id AS "to", kind, count, last_at AS lastAt FROM edge WHERE cura_id = ?').all(curaId) as { from: string; to: string; kind: NavigationKind; count: number; lastAt: string }[]
    return { nodes, edges }
  }

  /** @implements SPEC-ORBIS-P1-INDAGATIO */
  search(curaId: string, query: string): string[] {
    if (!query.trim()) return []
    const rows = this.db.prepare(`SELECT DISTINCT page.id FROM page JOIN page_fts ON page.url = page_fts.url WHERE page.cura_id = ? AND page.active = 1 AND page_fts MATCH ? ORDER BY page.last_visit DESC LIMIT 50`).all(curaId, query) as { id: string }[]
    return rows.map((row) => row.id)
  }

  /** @implements SPEC-ORBIS-P1-INDAGATIO */
  saveContent(page: Page, content: string): void {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      this.save({ ...page, content })
      this.db.prepare(
        `INSERT INTO page_content (page_id, content) VALUES (?, ?)
         ON CONFLICT(page_id) DO UPDATE SET content = excluded.content`
      ).run(page.id, content)
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  /** @implements SPEC-ORBIS-P5-VINCULUM page 単位で保存した本文だけを orbis.read(text) から返す。 */
  contentFor(pageId: string): string {
    const row = this.db.prepare('SELECT content FROM page_content WHERE page_id = ?').get(pageId) as { content?: string } | undefined
    return row?.content ?? ''
  }

  listByCura(curaId: string): Page[] {
    const rows = this.db
      .prepare('SELECT * FROM page WHERE cura_id = ? AND active = 1 ORDER BY last_visit DESC')
      .all(curaId) as Record<string, unknown>[]
    return rows.map(rowToPage)
  }

  deactivate(id: string): void {
    this.db.prepare('UPDATE page SET active = 0 WHERE id = ?').run(id)
  }

  /** @implements SPEC-ORBIS-P0-PERSISTENCE */
  recordNavigation(
    curaId: string,
    fromPageId: string | null,
    page: Page,
    kind: NavigationKind = 'navigate',
    deactivateFromPage = false
  ): void {
    this.db.exec('BEGIN IMMEDIATE')
    try {
      if (deactivateFromPage && fromPageId) this.deactivate(fromPageId)
      this.save(page)
      this.db.prepare('INSERT INTO visit (page_id, visited_at) VALUES (?, ?)').run(page.id, page.lastVisit)
      if (fromPageId) {
        const updated = this.db
          .prepare(
            `UPDATE edge SET count = count + 1, last_at = ?
             WHERE cura_id = ? AND from_page_id = ? AND to_page_id = ? AND kind = ?`
          )
          .run(page.lastVisit, curaId, fromPageId, page.id, kind)
        if (updated.changes === 0 || updated.changes === 0n) {
          this.db
            .prepare(
              `INSERT INTO edge (cura_id, from_page_id, to_page_id, kind, last_at)
               VALUES (?, ?, ?, ?, ?)`
            )
            .run(curaId, fromPageId, page.id, kind, page.lastVisit)
        }
      }
      this.db.exec('COMMIT')
    } catch (error) {
      this.db.exec('ROLLBACK')
      throw error
    }
  }

  findActiveByUrl(curaId: string, url: string): Page | undefined {
    const row = this.db.prepare('SELECT * FROM page WHERE cura_id = ? AND url = ? AND active = 1 LIMIT 1').get(curaId, url) as Record<string, unknown> | undefined
    return row ? rowToPage(row) : undefined
  }

  private syncFts(page: Page): void {
    const current = this.db.prepare('SELECT content FROM page_fts WHERE url = ? LIMIT 1').get(page.url) as { content?: string } | undefined
    const content = page.content ?? current?.content ?? ''
    this.db.prepare('DELETE FROM page_fts WHERE url = ?').run(page.url)
    this.db.prepare('INSERT INTO page_fts (title, url, content) VALUES (?, ?, ?)').run(page.title, page.url, content)
  }
}
