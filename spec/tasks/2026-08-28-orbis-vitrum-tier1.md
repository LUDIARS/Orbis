---
task: orbis-vitrum-tier1
project: Orbis
kind: 実装
created: 2026-08-28
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
  - spec/plan/2026-08-28-orbis-kaizen-6items.md
---
# Vitrum Tier 1 — CSS/SVG フィルタによるビュー単位の表示調整

## 目的

`spec/plan/2026-08-28-orbis-kaizen-6items.md` §4.2 のとおり、ページの最終描画に対する
色調・明暗・反転・ブラー等の調整を、`webContents.insertCSS` による CSS/SVG フィルタ注入で
ビュー単位に提供する (neco 採用決定 2026-08-28)。Tier 2 (WebGL 後処理) は本タスクの対象外。

## 要件

- `SPEC-ORBIS-VITRUM-SPEC`: `VitrumSpec { id, filters: FilterStep[] }`。`FilterStep` は種類を
  allowlist 化し、数値範囲を main process で検証して CSS を生成する。raw CSS / raw SVG を
  設定値として保存・注入しない。`id` は 1〜64 文字、`filters` は最大 16 step、永続化する
  JSON は UTF-8 で 16 KiB 以下とし、上限超過や未知の field は保存・適用前に拒否する。
- `SPEC-ORBIS-VITRUM-PRESETS`: プリセット `night-invert` / `low-stimulus` / `high-contrast` /
  `sepia-paper` + `none` を同梱する。ガンマ・シャープ系は検証に通ったものだけ提供する。
- `SPEC-ORBIS-VITRUM-APPLY`: 適用単位はビュー (ページ)。既定値は Habitus に持たせる。
  適用・解除は insertCSS / removeInsertedCSS の key 管理で行い、Forma の注入 CSS を解除しない。
  CSS は各 document の読み込み完了後に再適用し、再読込でも設定を維持する。別の `page` へ
  ナビゲーションした場合は、その page の設定、なければ現在の Habitus の設定を改めて解決する。
  設定変更が競合した場合は最後の要求だけを有効にし、置換失敗時は直前の有効な CSS を維持する。
  ビュー破棄時は Vitrum が所有する key とイベント listener を解放する。
- `SPEC-ORBIS-VITRUM-PERSIST`: Tabularium 新テーブル `vitrum (ownerKind, ownerId, spec)`
  (新規 migration、既存 migration の番号衝突に注意)。`ownerKind` は `page` / `habitus` の
  allowlist とし、`(ownerKind, ownerId)` を一意にする。ページ設定があればそれを、なければ
  ページの Habitus 設定を使う。
- `SPEC-ORBIS-VITRUM-ACTION`: Action `vitrum.cycle` (プリセット巡回) を登録し、
  コントロール帯 (PageControlBar) から選択できる UI を追加する。設定 UI からはプリセット選択と
  カスタムパラメータ編集ができる。

## スコープ

- 新規: `src/main/vitrum/{service.ts, presets/*.ts, css.ts}`、`spec/domains/` に vitrum ドメイン宣言、
  Tabularium migration + repository。
- 変更: `src/main/actions/`、`src/main/ipc/`、`src/main/habitus/`、`src/shared/`、`src/preload/`、
  `src/renderer/WindowControls/`、`src/renderer/Settings/`。
- 依存追加は禁止 (既存依存のみで実装する)。

## 完了条件

- ビューごとにプリセットを切り替えると描画に反映され、再起動後も保持される。
- 再読込後も選択中の設定が再適用され、別 page へのナビゲーション時は page → Habitus の
  優先順位で設定が切り替わる。ビュー破棄後に Vitrum の CSS key / listener が残らない。
- `npm run typecheck` と `npm test` が通る (service / CSS 生成 / preset 検証に加え、設定の
  サイズ・field 制限、優先順位、再読込時の再適用、競合する設定変更、破棄時 cleanup の
  単体テストを足す)。
- Anatomia ドメイン宣言があり、1 ファイル 1 責務 (SRP) を守る。

## 実装記録

- 2026-08-28: Vitrum の allowlist 検証・CSS 生成・ページ優先/Habitus fallback の永続化、ビューごとの CSS key 管理、IPC と PageControlBar / Settings のプリセット選択を実装した。
- 2026-08-28: `npm run typecheck` は作業環境に `node_modules` がなく `tsc` が未検出のため完走不可。依存追加は禁止のため、環境準備後に同コマンドと `vitest run` を実行する。
