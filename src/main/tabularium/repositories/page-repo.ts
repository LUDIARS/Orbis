import type { DatabaseSync } from 'node:sqlite'

export type NavigationKind = 'navigate' | 'newview'

export interface Page {
  id: string
  curaId: string
  url: string
  title: string
  firstVisit: string
  lastVisit: string
  active: boolean
}

const rowToPage = (row: Record<string, unknown>): Page => ({
  id: row.id as string,
  curaId: row.cura_id as string,
  url: row.url as string,
  title: row.title as string,
  firstVisit: row.first_visit as string,
  lastVisit: row.last_visit as string,
  active: Boolean(row.active)
})

/** @implements SPEC-ORBIS-P0-PERSISTENCE */
export class PageRepository {
  constructor(private readonly db: DatabaseSync) {}

  save(page: Page): void {
    this.db
      .prepare(
        `INSERT INTO page (id, cura_id, url, title, first_visit, last_visit, active)
         VALUES (@id, @curaId, @url, @title, @firstVisit, @lastVisit, @active)
         ON CONFLICT(id) DO UPDATE SET url = excluded.url, title = excluded.title,
           last_visit = excluded.last_visit, active = excluded.active`
      )
      .run({ ...page, active: Number(page.active) })
  }

  listByCura(curaId: string): Page[] {
    const rows = this.db
      .prepare('SELECT * FROM page WHERE cura_id = ? AND active = 1 ORDER BY last_visit')
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
}
