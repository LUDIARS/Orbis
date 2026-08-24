import type { DatabaseSync } from 'node:sqlite'

export interface Cura {
  id: string
  title: string
  color: string
  habitusId: string | null
  alwaysOnTop: boolean
  opacity: number
  createdAt: string
  lastActiveAt: string
}

const rowToCura = (row: Record<string, unknown>): Cura => ({
  id: row.id as string,
  title: row.title as string,
  color: row.color as string,
  habitusId: (row.habitus_id as string | null) ?? null,
  alwaysOnTop: Boolean(row.always_on_top),
  opacity: row.opacity as number,
  createdAt: row.created_at as string,
  lastActiveAt: row.last_active_at as string
})

/** @implements SPEC-ORBIS-P0-PERSISTENCE */
export class CuraRepository {
  constructor(private readonly db: DatabaseSync) {}

  save(cura: Cura): void {
    this.db
      .prepare(
        `INSERT INTO cura (id, title, color, habitus_id, always_on_top, opacity, created_at, last_active_at)
         VALUES (@id, @title, @color, @habitusId, @alwaysOnTop, @opacity, @createdAt, @lastActiveAt)
         ON CONFLICT(id) DO UPDATE SET title = excluded.title, always_on_top = excluded.always_on_top,
           opacity = excluded.opacity, last_active_at = excluded.last_active_at`
      )
      .run({ ...cura, alwaysOnTop: Number(cura.alwaysOnTop) })
  }

  list(): Cura[] {
    const rows = this.db.prepare('SELECT * FROM cura ORDER BY last_active_at DESC').all() as Record<string, unknown>[]
    return rows.map(rowToCura)
  }

  remove(id: string): void {
    this.db.prepare('DELETE FROM cura WHERE id = ?').run(id)
  }
}
