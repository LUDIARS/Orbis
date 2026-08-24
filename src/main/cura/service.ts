import { randomUUID } from 'node:crypto'
import type { Cura, CuraRepository } from '../tabularium/repositories/cura-repo.js'
export class CuraService {
  constructor(private readonly repository: CuraRepository) {}
  /** @implements SPEC-ORBIS-P0-CURA */
  create(): Cura { const now = new Date().toISOString(); const cura: Cura = { id: randomUUID(), title: 'New Cura', color: '#5b8cff', habitusId: 'desktop', alwaysOnTop: false, opacity: 1, createdAt: now, lastActiveAt: now }; this.repository.save(cura); return cura }
  /** @implements SPEC-ORBIS-P0-PERSISTENCE */
  list(): Cura[] { return this.repository.list() }
  /** @implements SPEC-ORBIS-P0-PERSISTENCE */
  update(cura: Cura): void { this.repository.save({ ...cura, lastActiveAt: new Date().toISOString() }) }
}
