---
task: orbis-ui-rich-step12
project: Orbis
kind: 実装
created: 2026-08-28
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
  - spec/plan/2026-08-28-orbis-kaizen-6items.md
---
# コントロール UI リッチ化 Step1/2 — モダン CSS + WebGL シェーダ装飾層

## 目的

`spec/plan/2026-08-28-orbis-kaizen-6items.md` §6.3 の Step1 (モダン CSS) と Step2
(WebGL2 シェーダ装飾層) を実装する (neco 採用決定 2026-08-28)。Step3 (Rive) は対象外。
対象は PageControlBar (コントロール帯)・Anulus・Rota・Speculum の Orbis 自身の UI。
外部 Web ページの描画には手を入れない。

## 要件

- `SPEC-ORBIS-UIRICH-TOKENS`: デザイントークン (色・角丸・余白・影・フォント) を CSS カスタム
  プロパティの共通ファイルに集約し、各コンポーネントの CSS Modules から参照する。
- `SPEC-ORBIS-UIRICH-CSS`: `backdrop-filter` によるすりガラス、`@property` 補間によるホバー/
  展開のマイクロアニメーションを PageControlBar と Anulus に適用する。透過ウインドウ
  (Anulus / Rota) で背景が破綻しないこと。
- `SPEC-ORBIS-UIRICH-SHADER`: WebGL2 canvas による装飾層を新設する。
  - Anulus 円環の背景に fragment shader のエフェクト (Pictor の `shaders/hologram.frag` の
    走査線+グロー表現を WebGL2 GLSL へ移植した簡約版) を描く。
  - PageControlBar の展開時背景にも同基盤の控えめなエフェクトを適用する。
  - shader 基盤 (canvas 初期化 / コンパイル / uniform 供給 / requestAnimationFrame 管理) は
    `src/renderer/shader/` に共通化し、1 ファイル 1 責務で分割する。
  - WebGL 初期化失敗時は CSS のみの表示に自動フォールバックする。
- `SPEC-ORBIS-UIRICH-PERF`: アニメーションは非表示時 (ウインドウ blur / メニュー閉) に停止し、
  CPU/GPU を食い続けない。

## スコープ

- 新規: `src/renderer/shader/`、共通トークン CSS、`spec/domains/` へのドメイン宣言追記。
- 変更: `src/renderer/WindowControls/`、Anulus renderer (`anulus.tsx` 配下)、必要なら
  `src/renderer/Rota/`・`speculum.tsx` のトークン参照化。
- main process 側の変更は原則なし。依存追加は禁止 (three.js 等を入れず素の WebGL2 で書く)。

## 完了条件

- コントロール帯と Anulus の見た目がトークン統一+すりガラス+シェーダ装飾になり、機能は不変。
- WebGL 不可環境でも従来相当の CSS 表示で動く。
- `npm run typecheck` と `vitest run` が通る (shader 基盤のロジック部に単体テストを足す)。

## 実装メモ

- `src/renderer/shader/` はコンパイル、描画、可視性判定、React canvas を責務ごとに分離する。
- WebGL2 が取得・コンパイル・リンクできない場合、canvas を描かず既存の CSS 背景を維持する。
