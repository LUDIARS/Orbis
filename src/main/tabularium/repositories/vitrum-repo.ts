import type { DatabaseSync } from 'node:sqlite'

export type VitrumOwnerKind = 'page' | 'habitus'

/** @implements SPEC-ORBIS-VITRUM-PERSIST Stores only validated JSON emitted by VitrumService. */
export class VitrumRepository {
  constructor(private readonly db: DatabaseSync) {}
  get(ownerKind: VitrumOwnerKind, ownerId: string): string | null {
    const row = this.db.prepare('SELECT spec FROM vitrum WHERE owner_kind = ? AND owner_id = ?').get(ownerKind, ownerId) as { spec?: unknown } | undefined
    return typeof row?.spec === 'string' ? row.spec : null
  }
  save(ownerKind: VitrumOwnerKind, ownerId: string, spec: string): void {
    this.db.prepare('INSERT INTO vitrum (owner_kind, owner_id, spec) VALUES (?, ?, ?) ON CONFLICT(owner_kind, owner_id) DO UPDATE SET spec = excluded.spec').run(ownerKind, ownerId, spec)
  }
}
