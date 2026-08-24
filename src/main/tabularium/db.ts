import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import initSql from './migrations/0001_init.sql?raw'
import productFactsSql from './migrations/0002_product_facts.sql?raw'

export type TabulariumDb = DatabaseSync

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
    if (version.user_version < 1) { database.exec(initSql); database.exec('PRAGMA user_version = 1') }
    if (version.user_version < 2) { database.exec(productFactsSql); database.exec('PRAGMA user_version = 2') }
    return database
  } catch (error) {
    database.close()
    throw error
  }
}
