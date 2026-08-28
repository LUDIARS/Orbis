import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import initSql from './migrations/0001_init.sql?raw'
import productFactsSql from './migrations/0002_product_facts.sql?raw'
import sigillumSql from './migrations/0003_sigillum.sql?raw'
import sigillumActiveSql from './migrations/0004_sigillum_active.sql?raw'
import windowStateSql from './migrations/0005_window_state.sql?raw'
import vitrumSql from './migrations/0006_vitrum.sql?raw'

export type TabulariumDb = DatabaseSync

/** @implements SPEC-ORBIS-P0-PERSISTENCE Schema と user_version を同じ transaction で確定する。 */
function applyMigration(database: DatabaseSync, sql: string, version: number): void {
  database.exec('BEGIN IMMEDIATE')
  try {
    database.exec(sql)
    database.exec(`PRAGMA user_version = ${version}`)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
}

/**
 * Tabularium: SQLite を開いて初期スキーマを適用する。
 * Node/Electron 同梱の node:sqlite を使い、 ネイティブモジュールの ABI 再ビルドを不要にする。
 */
/** @implements SPEC-ORBIS-P0-PERSISTENCE */
export function openDatabase(file = join(app.getPath('userData'), 'orbis.sqlite')): TabulariumDb {
  const database = new DatabaseSync(file)
  try {
    database.exec('PRAGMA foreign_keys = ON')
    const version = database.prepare('PRAGMA user_version').get() as { user_version: number }
    if (version.user_version < 1) applyMigration(database, initSql, 1)
    if (version.user_version < 2) applyMigration(database, productFactsSql, 2)
    if (version.user_version < 3) applyMigration(database, sigillumSql, 3)
    if (version.user_version < 4) applyMigration(database, sigillumActiveSql, 4)
    if (version.user_version < 5) applyMigration(database, windowStateSql, 5)
    if (version.user_version < 6) applyMigration(database, vitrumSql, 6)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}
