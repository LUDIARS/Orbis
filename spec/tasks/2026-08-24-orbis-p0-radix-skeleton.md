---
task: orbis-p0-radix-skeleton
project: Orbis
kind: 実装
created: 2026-08-24
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
---
# Orbis P0 Radix ブラウザ骨格

## 目的

Electron zero-patch 構成で、Cura ごとの WebContentsView 閲覧、SQLite 永続化、Fenestra
ショートカット、最小 UI と追従 CI を提供する。

## 完了条件

- アドレスバーから URL を開き、戻る・進む・リロード・新規ページ・閉じるを ActionId 経由で行える。
- Cura とページは SQLite に保存され、次回起動時に復元される。
- Fenestra の AlwaysOnTop、最小化、透明度ショートカットが機能する。
- 型検査・Vitest・3 OS の package directory CI が定義されている。

## スコープ

- `src/` `.github/workflows/` `scripts/` `spec/domains/` `spec/tasks/`

## 仕様トレーサビリティ

- `SPEC-ORBIS-P0-RADIX`: 単一インスタンス、Cura 復元、終了時の資源解放、Electron 版追従を担う。
- `SPEC-ORBIS-P0-CURA`: 1 Cura 1 window とし、各 active page の view を選択・生成・破棄する。
- `SPEC-ORBIS-P0-NAVIGATION`: アドレス入力、履歴、HTTP(S) 遷移、遷移元からの edge 記録を担う。
- `SPEC-ORBIS-P0-PERSISTENCE`: Cura、active page、visit、集約済み edge を SQLite へ原子的に保存する。
- `SPEC-ORBIS-P0-ACTIONS`: UI と Clavis の入力を検証済み ActionId に解決して実行する。
- `SPEC-ORBIS-P0-CLAVIS`: UI と remote page のどちらにフォーカスがあっても既定ショートカットを解決する。
- `SPEC-ORBIS-P0-IPC`: 許可済みチャネル、型付き payload、Cura UI の送信元検証を境界とする。
- `SPEC-ORBIS-P0-RENDERER`: active page の選択、アドレス入力、操作、状態・エラー表示を提供する。
- `SPEC-ORBIS-P0-FENESTRA`: AlwaysOnTop、非固定 window の最小化、対応 OS の透明度遷移を担う。
- `SPEC-ORBIS-P0-CI`: 型検査、単体テスト、3 OS package と Electron stable 追従 branch を自動化する。

## 検証 (2026-08-24)

- `npm run typecheck` 0 エラー / `npm test` 5 pass / `npm run build` 成功。
- 実起動: ウインドウが開き example.com が WebContentsView に表示 (タイトル "Example Domain" 取得)。
  SQLite (`%APPDATA%/orbis/orbis.sqlite`) に cura / page / visit が保存され、再起動で Cura と
  ページが復元された (cura 1 のまま、visit が 1→2)。
- ショートカット (Ctrl+Shift+T/M/O/N) はキー送出での実機確認は未実施。 Action ID → CuraController の
  経路のうち、binding 表と Fenestra 状態機械のみ unit test で確認済み。Electron の入力イベントから
  Action 実行までの結線は runtime check を要する。

### Revisor 修正後

- URL/renderer の境界検証、IPC 送信元検証、複数 page view の選択・破棄、DB transaction、
  Electron 追従 branch の永続化を追加した。
- Revisor の読み書き限定ポリシーにより、修正後の型検査・テスト・Electron 実起動は未実施。

## 設計からの逸脱

- Tabularium は better-sqlite3 でなく Node/Electron 同梱の `node:sqlite` を使う。
  better-sqlite3 は Electron ABI 向け再ビルドが必要で、 vitest (Node ABI) と同居できないため。
- 委託 (Sol) 初稿は action が renderer へ `webContents.send` するだけで main 側に受け手が無く
  動作しなかったため、 `CuraController` (cura/window-factory が実装) を Action に渡す形に修正した。
