import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { afterEach, describe, expect, it } from 'vitest'
import { chromiumTimeToIso, readChromiumHistory } from '../src/main/migratio/chromium-history'

const folders: string[] = []
const chromeTime = (iso: string): number => Date.parse(iso) * 1000 - Date.UTC(1601, 0, 1) * 1000

const fixture = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'orbis-history-test-'))
  folders.push(folder)
  const file = join(folder, 'History')
  const db = new DatabaseSync(file)
  db.exec('CREATE TABLE urls (id INTEGER PRIMARY KEY, url TEXT, title TEXT); CREATE TABLE visits (id INTEGER PRIMARY KEY, url INTEGER, visit_time INTEGER, from_visit INTEGER, transition INTEGER);')
  db.prepare('INSERT INTO urls VALUES (?, ?, ?)').run(1, 'https://one.example/', 'One')
  db.prepare('INSERT INTO urls VALUES (?, ?, ?)').run(2, 'https://two.example/?gclid=x', 'Two')
  db.prepare('INSERT INTO urls VALUES (?, ?, ?)').run(3, 'https://skip.example/', 'Skip')
  db.prepare('INSERT INTO visits VALUES (?, ?, ?, ?, ?)').run(1, 1, chromeTime('2026-08-01T10:00:00.000Z'), 0, 0)
  db.prepare('INSERT INTO visits VALUES (?, ?, ?, ?, ?)').run(2, 2, chromeTime('2026-08-01T10:01:00.000Z'), 1, 1)
  db.prepare('INSERT INTO visits VALUES (?, ?, ?, ?, ?)').run(3, 3, chromeTime('2026-08-01T10:02:00.000Z'), 2, 8)
  db.prepare('INSERT INTO visits VALUES (?, ?, ?, ?, ?)').run(4, 1, chromeTime('2026-08-01T10:03:00.000Z'), 2, 0)
  db.prepare('INSERT INTO visits VALUES (?, ?, ?, ?, ?)').run(5, 2, chromeTime('2026-08-01T10:04:00.000Z'), 4, 0)
  db.close()
  return file
}

afterEach(() => { for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true }) })

describe('Chromium history', () => {
  it('converts Chromium timestamps', () => expect(chromiumTimeToIso(chromeTime('2026-08-01T10:00:00.000Z'))).toBe('2026-08-01T10:00:00.000Z'))

  it('filters transitions and creates navigation edges', () => {
    const curas = readChromiumHistory(fixture(), 'chrome')
    expect(curas).toHaveLength(1)
    expect(curas[0].pages).toHaveLength(4)
    expect(curas[0].edges.find((edge) => edge.fromUrl === 'https://one.example/' && edge.toUrl === 'https://two.example/'))
      .toMatchObject({ kind: 'navigate', count: 2 })
  })

  it('applies an explicit visit limit without treating an omitted limit as zero', () => {
    expect(readChromiumHistory(fixture(), 'chrome', { limit: 1 })[0].pages).toHaveLength(1)
  })
})
