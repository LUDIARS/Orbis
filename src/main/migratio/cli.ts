import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { readChromiumBookmarks } from './chromium-bookmarks.ts'
import { readChromiumHistory } from './chromium-history.ts'
import { getBrowserUserDataDirectory, listProfiles, resolveProfileDirectory, type ChromiumBrowser } from './profile-locator.ts'
import { importCuras } from './importer.ts'

interface Arguments {
  browser?: ChromiumBrowser
  profile?: string
  db?: string
  dryRun: boolean
  listProfiles: boolean
  since?: Date
  limit?: number
}

/** @implements SPEC-ORBIS-MIGRATIO-CLI */
const parseArguments = (values: string[]): Arguments => {
  const result: Arguments = { dryRun: false, listProfiles: false }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    const next = values[index + 1]
    if (value === '--from' && (next === 'chrome' || next === 'vivaldi')) {
      result.browser = next
      index += 1
    } else if (value === '--profile' && next) {
      result.profile = next
      index += 1
    } else if (value === '--db' && next) {
      result.db = next
      index += 1
    } else if (value === '--since' && next) {
      const parsed = new Date(next)
      if (Number.isNaN(parsed.valueOf())) throw new Error('--since must be an ISO date')
      result.since = parsed
      index += 1
    } else if (value === '--limit' && next) {
      const parsed = Number(next)
      if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error('--limit must be a positive integer')
      result.limit = parsed
      index += 1
    } else if (value === '--dry-run') {
      result.dryRun = true
    } else if (value === '--list-profiles') {
      result.listProfiles = true
    } else {
      throw new Error(`Unknown or incomplete option: ${value}`)
    }
  }
  return result
}

/** @implements SPEC-ORBIS-MIGRATIO-CLI */
const defaultDatabasePath = (): string => process.platform === 'win32'
  ? join(process.env.APPDATA ?? homedir(), 'orbis', 'orbis.sqlite')
  : join(homedir(), '.config', 'orbis', 'orbis.sqlite')

/** @implements SPEC-ORBIS-MIGRATIO-IMPORTER */
const initializeSchema = (database: DatabaseSync): void => {
  const schemaFile = join(dirname(process.argv[1]), '../tabularium/migrations/0001_init.sql')
  database.exec('PRAGMA foreign_keys = ON')
  database.exec(readFileSync(schemaFile, 'utf8'))
}

/** @implements SPEC-ORBIS-MIGRATIO-CLI */
export function runImport(values: string[]): string {
  const args = parseArguments(values)
  if (!args.browser) throw new Error('--from chrome|vivaldi is required')
  if (args.listProfiles) return listProfiles(args.browser).join('\n')
  const profile = resolveProfileDirectory(args.browser, args.profile)
  if (!existsSync(profile)) throw new Error('Browser profile was not found')
  const bookmarksFile = join(profile, 'Bookmarks')
  const historyFile = join(profile, 'History')
  if (!existsSync(bookmarksFile) && !existsSync(historyFile)) throw new Error('Browser data was not found')
  const curas = [
    ...readChromiumBookmarks(bookmarksFile, args.browser),
    ...readChromiumHistory(historyFile, args.browser, { since: args.since, limit: args.limit })
  ]
  const dbFile = args.db ?? defaultDatabasePath()
  if (!args.dryRun) mkdirSync(dirname(dbFile), { recursive: true })
  const database = new DatabaseSync(args.dryRun ? ':memory:' : dbFile)
  try {
    initializeSchema(database)
    const counts = importCuras(database, curas, args.dryRun)
    return `cura=${counts.cura} page=${counts.page} visit=${counts.visit} edge=${counts.edge}`
  } catch (error) {
    if (String(error).includes('SQLITE_BUSY') || String(error).includes('database is locked')) throw new Error('Orbis を終了してから実行してください')
    throw error
  } finally {
    database.close()
  }
}

if (process.argv[1]?.endsWith('cli.ts')) {
  try {
    console.log(runImport(process.argv.slice(2)))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Import failed')
    process.exitCode = 1
  }
}

export { getBrowserUserDataDirectory }
