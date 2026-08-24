import type { Cura } from '../tabularium/repositories/cura-repo.js'
import type { HabitusId } from './types.js'
import { habitusPresets, isHabitusId } from './presets/index.js'
import type { DatabaseSync } from 'node:sqlite'

/** @implements SPEC-ORBIS-P2-HABITUS */
export class HabitusService {
  constructor(private readonly db: DatabaseSync) {}

  getCuraDefault(cura: Cura): HabitusId {
    return isHabitusId(cura.habitusId) ? cura.habitusId : 'desktop'
  }

  setCuraDefault(cura: Cura, habitusId: HabitusId): Cura {
    this.db.prepare('UPDATE cura SET habitus_id = ? WHERE id = ?').run(habitusId, cura.id)
    return { ...cura, habitusId }
  }

  getPageOverride(pageId: string): HabitusId | null {
    const row = this.db.prepare('SELECT data FROM habitus WHERE id = ?').get(`page:${pageId}`) as { data?: string } | undefined
    if (!row?.data) return null
    try { const value = JSON.parse(row.data) as { habitusId?: unknown }; return isHabitusId(value.habitusId) ? value.habitusId : null } catch { return null }
  }

  setPageOverride(pageId: string, habitusId: HabitusId | null): void {
    const id = `page:${pageId}`
    if (!habitusId) { this.db.prepare('DELETE FROM habitus WHERE id = ?').run(id); return }
    this.db.prepare('INSERT INTO habitus (id, name, data) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data').run(id, 'page override', JSON.stringify({ habitusId }))
  }

  resolve(cura: Cura, pageId: string): HabitusId {
    return this.getPageOverride(pageId) ?? this.getCuraDefault(cura)
  }

  preset(id: HabitusId) { return habitusPresets[id] }
}
