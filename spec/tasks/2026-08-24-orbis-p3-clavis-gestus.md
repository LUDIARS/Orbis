---
task: orbis-p3-clavis-gestus
project: Orbis
kind: 実装
created: 2026-08-24
---
# Orbis P3 Clavis / Gestus / Settings

## 目的

ショートカットとマウスジェスチャを共通 Action ID に束縛し、ユーザーが設定画面から永続的に再束縛できるようにする。

## 完了条件

- `SPEC-ORBIS-P3-CLAVIS`: 7 つの既定キーと衝突検知・再束縛を提供する。`rota.open` は P4 実装までログ出力のみとする。
- `SPEC-ORBIS-P3-GESTUS`: 8 方向の軌跡を page 操作へ解決し、認識中の状態を UI に送る。
- `SPEC-ORBIS-P3-SETTINGS`: key/gesture の束縛を SQLite の `binding` テーブルへ保存・既定復帰できる。
- `SPEC-ORBIS-P3-OVERLAY`: 軌跡と候補アクション名を SVG オーバーレイで表示する。
