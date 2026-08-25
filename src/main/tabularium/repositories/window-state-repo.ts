import type { DatabaseSync } from 'node:sqlite'

export interface WindowState { ownerKind: 'anulus' | 'speculum' | 'page'; ownerId: string; displayId: string | null; x: number; y: number; width: number; height: number; visible: boolean }

/** @implements SPEC-ORBIS-P8-WINDOW-STATE シェル上のウインドウ状態だけを永続化する。 */
export class WindowStateRepository {
  constructor(private readonly db: DatabaseSync) {}
  get(ownerKind: WindowState['ownerKind'], ownerId: string): WindowState | undefined {
    const row = this.db.prepare('SELECT owner_kind, owner_id, display_id, x, y, width, height, visible FROM window_state WHERE owner_kind = ? AND owner_id = ?').get(ownerKind, ownerId) as Record<string, unknown> | undefined
    return row ? { ownerKind: row.owner_kind as WindowState['ownerKind'], ownerId: row.owner_id as string, displayId: row.display_id as string | null, x: row.x as number, y: row.y as number, width: row.width as number, height: row.height as number, visible: Boolean(row.visible) } : undefined
  }
  save(state: WindowState): void {
    this.db.prepare(`INSERT INTO window_state (owner_kind, owner_id, display_id, x, y, width, height, visible) VALUES (@ownerKind, @ownerId, @displayId, @x, @y, @width, @height, @visible) ON CONFLICT(owner_kind, owner_id) DO UPDATE SET display_id=excluded.display_id,x=excluded.x,y=excluded.y,width=excluded.width,height=excluded.height,visible=excluded.visible`).run({ ...state, visible: Number(state.visible) })
  }
}
