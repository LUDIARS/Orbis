import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { normalizeUrl } from './url-normalizer.ts'
import type { ImportedCura, ImportedEdge, ImportedPage } from './types.ts'

const chromiumEpoch = Date.UTC(1601, 0, 1)
const permittedTransitions = new Set([0, 1, 2, 5])

interface HistoryRow {
  id: number | bigint
  url: string
  title: string
  visit_time: number | bigint
  from_visit: number | bigint
  transition: number | bigint
}

interface HistoryCuraState {
  cura: ImportedCura
  edgesByRoute: Map<string, ImportedEdge>
}

export interface HistoryOptions {
  since?: Date
  limit?: number
}

/** @implements SPEC-ORBIS-MIGRATIO-HISTORY */
const addNavigationEdge = (state: HistoryCuraState, fromUrl: string, toUrl: string, lastAt: string): void => {
  const route = JSON.stringify([fromUrl, toUrl])
  const existing = state.edgesByRoute.get(route)
  if (existing) {
    existing.count += 1
    if (lastAt > existing.lastAt) existing.lastAt = lastAt
    return
  }
  const edge: ImportedEdge = { fromUrl, toUrl, kind: 'navigate', count: 1, lastAt }
  state.edgesByRoute.set(route, edge)
  state.cura.edges.push(edge)
}

/** @implements SPEC-ORBIS-MIGRATIO-HISTORY */
export function chromiumTimeToIso(microseconds: number | bigint): string {
  const milliseconds = typeof microseconds === 'bigint' ? Number(microseconds / 1000n) : microseconds / 1000
  return new Date(chromiumEpoch + milliseconds).toISOString()
}

/** @implements SPEC-ORBIS-MIGRATIO-HISTORY */
export function isImportableTransition(transition: number | bigint): boolean {
  const core = typeof transition === 'bigint' ? Number(transition & 0xffn) : transition & 0xff
  return permittedTransitions.has(core)
}

/** @implements SPEC-ORBIS-MIGRATIO-HISTORY */
export function readChromiumHistory(historyFile: string, browser: string, options: HistoryOptions = {}): ImportedCura[] {
  if (!existsSync(historyFile)) return []
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'orbis-history-'))
  const copy = join(temporaryDirectory, 'History')
  let database: DatabaseSync | undefined
  try {
    copyFileSync(historyFile, copy)
    database = new DatabaseSync(copy, { readOnly: true })
    const statement = database.prepare(
      `SELECT visits.id, urls.url, COALESCE(urls.title, '') AS title,
         visits.visit_time, visits.from_visit, visits.transition
       FROM visits JOIN urls ON urls.id = visits.url ORDER BY visits.visit_time DESC`
    )
    statement.setReadBigInts(true)
    const rows = statement.all() as unknown as HistoryRow[]
    const importable = rows
      .filter((row) => isImportableTransition(row.transition))
      .filter((row) => !options.since || chromiumTimeToIso(row.visit_time) >= options.since.toISOString())
    const selected = options.limit === undefined ? importable : importable.slice(0, options.limit)
    const byVisitId = new Map(selected.map((row) => [row.id, row]))
    const curas = new Map<string, HistoryCuraState>()
    for (const row of selected) {
      const url = normalizeUrl(row.url)
      if (!url) continue
      const visitedAt = chromiumTimeToIso(row.visit_time)
      const month = visitedAt.slice(0, 7)
      const title = `Imported: ${browser} history (${month})`
      const state = curas.get(month) ?? {
        cura: { key: `history:${browser}:${month}`, title, color: '#475569', pages: [], edges: [] },
        edgesByRoute: new Map<string, ImportedEdge>()
      }
      state.cura.pages.push({ url, title: row.title, pinned: false, visitedAt })
      const source = byVisitId.get(row.from_visit)
      const sourceUrl = source ? normalizeUrl(source.url) : null
      if (source && sourceUrl && chromiumTimeToIso(source.visit_time).slice(0, 7) === month && sourceUrl !== url) {
        addNavigationEdge(state, sourceUrl, url, visitedAt)
      }
      curas.set(month, state)
    }
    return [...curas.values()].map((state) => state.cura)
  } finally {
    try {
      database?.close()
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  }
}
