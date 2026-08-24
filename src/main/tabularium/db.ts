import { DatabaseSync } from 'node:sqlite'
import { app } from 'electron'
import { join } from 'node:path'
import initSql from './migrations/0001_init.sql?raw'

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
    database.exec(initSql)
    return database
  } catch (error) {
    database.close()
    throw error
  }
}
