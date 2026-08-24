---
task: orbis-p1-nexus-indagatio
project: Orbis
kind: 実装
created: 2026-08-24
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
---
# Orbis P1 Nexus / Indagatio / GraphPane

## 目的

ページ遷移を Cura ごとの関心グラフとして保存・表示し、ページ本文を横断検索できるようにする。

## 完了条件

- ページ遷移と新規 view がグラフのノード・エッジとして表示される。
- 検索結果が GraphPane で強調され、選択で対応 view を前面化できる。
- SQLite からグラフと FTS 検索対象が復元される。

## 仕様トレーサビリティ

- `SPEC-ORBIS-P1-NEXUS`: URL 正規化、遷移追跡、Cura 単位グラフ投影を担う。
- `SPEC-ORBIS-P1-INDAGATIO`: page_fts の同期と検索を担う。
- `SPEC-ORBIS-P1-GRAPHPANE`: グラフ描画・強調・レイアウト切替・選択を担う。
- `SPEC-ORBIS-P1-IPC`: 検索、グラフ状態、表示設定の型付き IPC 境界を担う。
