import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { describe, expect, it } from 'vitest'
import { VitrumRepository } from '../src/main/tabularium/repositories/vitrum-repo.js'
import { VitrumService } from '../src/main/vitrum/service.js'

function service(): { vitrum: VitrumService; db: DatabaseSync } {
  const db = new DatabaseSync(':memory:')
  db.exec(readFileSync('src/main/tabularium/migrations/0006_vitrum.sql', 'utf8'))
  return { vitrum: new VitrumService(new VitrumRepository(db)), db }
}

class ControlledWebContents extends EventEmitter {
  readonly id = 101
  readonly inserted: string[] = []
  readonly removed: string[] = []
  readonly pending: Array<{ resolve: (key: string) => void; reject: (reason: unknown) => void }> = []
  isDestroyed(): boolean { return false }
  insertCSS(css: string): Promise<string> {
    this.inserted.push(css)
    return new Promise((resolve, reject) => this.pending.push({ resolve, reject }))
  }
  removeInsertedCSS(key: string): Promise<void> {
    this.removed.push(key)
    return Promise.resolve()
  }
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

describe('VitrumService', () => {
  it('uses a page spec before the Habitus default and persists validated specs', () => {
    const { vitrum, db } = service()
    try {
      vitrum.saveHabitus('desktop', { id: 'low-stimulus', filters: [] })
      expect(vitrum.stateFor('page', 'desktop').spec.id).toBe('low-stimulus')
      vitrum.savePage('page', { id: 'high-contrast', filters: [] })
      expect(vitrum.stateFor('page', 'desktop').spec.id).toBe('high-contrast')
    } finally { db.close() }
  })
  it('rejects oversized and unknown specs before persistence', () => {
    const { vitrum, db } = service()
    try {
      expect(() => vitrum.savePage('page', { id: 'x'.repeat(65), filters: [] })).toThrow()
      expect(() => vitrum.savePage('page', { id: 'custom', filters: [], rawCss: 'html{}' })).toThrow()
    } finally { db.close() }
  })
  it('uses canonical filters for bundled preset ids', () => {
    const { vitrum, db } = service()
    try {
      const saved = vitrum.savePage('page', { id: 'none', filters: [{ kind: 'brightness', value: 0 }] })
      expect(saved).toEqual({ id: 'none', filters: [] })
    } finally { db.close() }
  })
  it('cycles across the bundled finite presets', () => {
    const { vitrum, db } = service()
    try { expect(vitrum.cycle('page', 'desktop').id).toBe('night-invert') } finally { db.close() }
  })
  it('keeps only the latest successful CSS request and cleans up listeners and keys', async () => {
    const { vitrum, db } = service()
    const webContents = new ControlledWebContents()
    const electronWebContents = webContents as unknown as WebContents
    try {
      const dispose = vitrum.watch(electronWebContents, () => 'page', () => 'desktop')
      webContents.emit('did-finish-load')
      vitrum.apply(electronWebContents, 'page', 'desktop')
      webContents.pending[1].resolve('latest')
      await settle()
      webContents.pending[0].resolve('stale')
      await settle()
      expect(webContents.removed).toEqual(['stale'])

      vitrum.apply(electronWebContents, 'page', 'desktop')
      webContents.pending[2].reject(new Error('insertion failed'))
      await settle()
      webContents.emit('destroyed')
      dispose()
      await settle()
      expect(webContents.listenerCount('did-finish-load')).toBe(0)
      expect(webContents.listenerCount('destroyed')).toBe(0)
      expect(webContents.removed).toEqual(['stale', 'latest'])
    } finally { db.close() }
  })
})
