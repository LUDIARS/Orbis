import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { normalizeUrl } from './url-normalizer.ts'
import type { ImportedCura } from './types.ts'

export interface ImportCounts { cura: number; page: number; visit: number; edge: number }

type CountedTable = 'cura' | 'page' | 'visit' | 'edge'

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const deterministicUuid = (value: string): string => {
  const hex = createHash('sha1').update(value).digest('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const pageId = (curaId: string, url: string): string => deterministicUuid(`${curaId}:${url}`)

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const curaId = (key: string): string => deterministicUuid(`migratio:${key}`)

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const count = (database: DatabaseSync, table: CountedTable): number => Number(
  (database.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count
)

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const normalizeCura = (cura: ImportedCura): ImportedCura => ({
  ...cura,
  pages: cura.pages.flatMap((page) => {
    const url = normalizeUrl(page.url)
    return url ? [{ ...page, url }] : []
  })
})

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
export function importCuras(database: DatabaseSync, curas: ImportedCura[], dryRun = false): ImportCounts {
  const normalized = curas.map(normalizeCura)
  if (dryRun) {
    return {
      cura: normalized.length,
      page: normalized.reduce((total, cura) => total + new Set(cura.pages.map((page) => page.url)).size, 0),
      visit: normalized.reduce((total, cura) => total + cura.pages.filter((page) => page.visitedAt).length, 0),
      edge: normalized.reduce((total, cura) => total + cura.edges.length, 0)
    }
  }
  database.exec('BEGIN IMMEDIATE')
  try {
    const before = { cura: count(database, 'cura'), page: count(database, 'page'), visit: count(database, 'visit'), edge: count(database, 'edge') }
    for (const cura of normalized) {
      const id = curaId(cura.key)
      const now = new Date().toISOString()
      database.prepare(
        `INSERT INTO cura (id, title, color, created_at, last_active_at) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, color = excluded.color`
      ).run(id, cura.title, cura.color, now, now)
      const pages = new Map<string, string>()
      for (const page of cura.pages) {
        const idForPage = pageId(id, page.url)
        pages.set(page.url, idForPage)
        const at = page.visitedAt ?? now
        database.prepare(
          `INSERT INTO page (id, cura_id, url, title, first_visit, last_visit, pinned)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             title = CASE
               WHEN excluded.title <> '' AND excluded.last_visit >= page.last_visit THEN excluded.title
               ELSE page.title
             END,
             first_visit = MIN(page.first_visit, excluded.first_visit),
             last_visit = MAX(page.last_visit, excluded.last_visit),
             pinned = MAX(page.pinned, excluded.pinned)`
        ).run(idForPage, id, page.url, page.title, at, at, Number(page.pinned))
        const ftsRow = database.prepare('SELECT rowid, title, url FROM page WHERE id = ?').get(idForPage) as {
          rowid: number
          title: string
          url: string
        }
        database.prepare('DELETE FROM page_fts WHERE rowid = ?').run(ftsRow.rowid)
        database.prepare("INSERT INTO page_fts (rowid, title, url, content) VALUES (?, ?, ?, '')")
          .run(ftsRow.rowid, ftsRow.title, ftsRow.url)
        if (page.visitedAt) {
          database.prepare('INSERT INTO visit (page_id, visited_at) SELECT ?, ? WHERE NOT EXISTS (SELECT 1 FROM visit WHERE page_id = ? AND visited_at = ?)')
            .run(idForPage, page.visitedAt, idForPage, page.visitedAt)
        }
      }
      for (const edge of cura.edges) {
        const fromId = pages.get(edge.fromUrl)
        const toId = pages.get(edge.toUrl)
        if (!fromId || !toId) continue
        const current = database.prepare(
          'SELECT id, count FROM edge WHERE cura_id = ? AND from_page_id = ? AND to_page_id = ? AND kind = ?'
        ).get(id, fromId, toId, edge.kind) as { id: number; count: number } | undefined
        if (current) {
          database.prepare('UPDATE edge SET count = MAX(count, ?), last_at = MAX(last_at, ?) WHERE id = ?').run(edge.count, edge.lastAt, current.id)
        } else {
          database.prepare('INSERT INTO edge (cura_id, from_page_id, to_page_id, kind, count, last_at) VALUES (?, ?, ?, ?, ?, ?)')
            .run(id, fromId, toId, edge.kind, edge.count, edge.lastAt)
        }
      }
    }
    const after = { cura: count(database, 'cura'), page: count(database, 'page'), visit: count(database, 'visit'), edge: count(database, 'edge') }
    database.exec('COMMIT')
    return { cura: after.cura - before.cura, page: after.page - before.page, visit: after.visit - before.visit, edge: after.edge - before.edge }
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}
