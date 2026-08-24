---
task: orbis-migratio-import
project: Orbis
kind: 実装
created: 2026-08-24
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
---
# Orbis Migratio ブラウザインポート

## 目的

Chrome と Vivaldi のブックマーク・閲覧履歴を、個人情報を最小限に扱いながら Tabularium の
Cura、ページ、訪問、エッジ、全文検索へ冪等に取り込む。

## 完了条件

- `npm run import -- --from chrome|vivaldi` がプロファイルを解決し、Bookmarks と History を取り込める。
- フォルダ単位・月単位の Cura、正規化 URL、manual/navigate edge、FTS が保存され、再実行で重複しない。
- `--profile`、`--list-profiles`、`--since`、`--limit`、`--db`、`--dry-run` を提供する。

## スコープ

- `src/main/migratio/` `scripts/import.mjs` `spec/domains/` `spec/tasks/` `test/migratio-*.test.ts`

## 仕様トレーサビリティ

- `SPEC-ORBIS-MIGRATIO-PROFILE`: OS 別の Chromium user data と Local State の最終利用プロファイルを解決し、プロファイル一覧を提供する。
- `SPEC-ORBIS-MIGRATIO-BOOKMARKS`: Bookmarks JSON を Cura、pinned page、manual edge の中間モデルへ変換する。
- `SPEC-ORBIS-MIGRATIO-HISTORY`: History を一時コピーして読み取り、時刻・transition・月別 Cura・navigate edge を変換する。
- `SPEC-ORBIS-MIGRATIO-IMPORTER`: URL を正規化して Tabularium へ単一トランザクションで upsert し、FTS と冪等性を保証する。
- `SPEC-ORBIS-MIGRATIO-CLI`: CLI 引数を検証し、対象プロファイルの列挙またはインポートを実行する。

## 設計からの逸脱

- P1 で予定される `src/main/nexus/url-normalizer.ts` がマージされた後、Migratio の URL 正規化を共通実装へ統合する。
