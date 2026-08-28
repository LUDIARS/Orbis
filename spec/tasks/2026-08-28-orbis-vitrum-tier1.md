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
  設定値として保存・注入しない。
- `SPEC-ORBIS-VITRUM-PRESETS`: プリセット `night-invert` / `low-stimulus` / `high-contrast` /
  `sepia-paper` + `none` を同梱する。ガンマ・シャープ系は検証に通ったものだけ提供する。
- `SPEC-ORBIS-VITRUM-APPLY`: 適用単位はビュー (ページ)。既定値は Habitus に持たせる。
  適用・解除は insertCSS / removeInsertedCSS の key 管理で行い、Forma の注入 CSS を解除しない。
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
- `npm run typecheck` と `npm test` が通る (service / css 生成 / preset 検証の単体テストを足す)。
- Anatomia ドメイン宣言があり、1 ファイル 1 責務 (SRP) を守る。
