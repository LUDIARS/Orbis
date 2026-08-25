---
task: orbis-p8-anulus
project: Orbis
kind: 実装
created: 2026-08-25
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
---
# P8 — Anulus シェル

## 目的

従来の起動時メイン閲覧ウインドウを、常設 Anulus と常設 Speculum を起点にしたシェルへ移行する。

## 完了条件

- Anulus は透過・枠なし・最前面で起動し、入力を URL または検索語として解決して Cura を開く。
- Speculum は独立ウインドウで Nexus ノードを選択できる。
- Anulus / Speculum / ページの位置と表示状態を migration 0005 の window_state に保存する。
- 可視ページはページごとに専用の `BrowserWindow` と `WebContentsView` を持ち、ページバーから URL/検索、戻る、進む、再読込を行える。
- Umbra は BrowserWindow を作らず、Speculum ノード選択による reveal 時に初めてページウインドウを作る。

## 実装内容

- `SPEC-ORBIS-P8-ANULUS`: Anulus を常設の認可済み renderer として生成し、入力と可視ページ選択を提供する。
- `SPEC-ORBIS-P8-PAGE-WINDOW`: 可視ページごとに独立した `BrowserWindow` と `WebContentsView` を所有し、ページバー操作を対象ページへ配送する。
- `SPEC-ORBIS-P8-SPECULUM`: Speculum を常設グラフウインドウとして生成し、ノード選択を対象ページの前面化または reveal へ接続する。
- `SPEC-ORBIS-P8-WINDOW-STATE`: display ID、bounds、表示状態を保存し、復元時は現存する display の work area 内へ補正する。
- `CuraWindowFactory` は logical Cura のページ群を管理し、可視ページだけへ個別の BrowserWindow を接続する。
- Speculum は graph snapshot の変更通知を受けて描画を更新する。ノード選択は既存の page ID 契約を保ったままページの前面化または Umbra reveal を行う。
- Anulus は navigation-intent による入力処理と可視ページの円周ボタンを持つ。

## 設計上の残件

- P9 の Dispositio（散開/グラフ状の配置、同時表示数）および P10 のページ単位最前面・追従・透明度・固定はこの P8 には含めない。
- Anulus の円周は選択中の Cura に属する可視ページを最大 8 件まで表示する。ドラッグによる並べ替えと右クリック操作メニューは P9/P10 の配置・挙動 UI と合わせて拡張する。

## 引き継ぎ監査 (2026-08-25)

- `CuraWindowFactory` の非表示 compatibility `BrowserWindow` を廃止し、Cura はページ群の論理的所有者だけを担う構成へ移行した。
- 旧 `CuraShell` / `PageTabs` と renderer の旧 main entry を削除し、可視ページだけを `PageWindowFactory` が独立ウインドウへ接続する。
- Anulus の Cura 切替と現在 Cura のページ絞り込み、Speculum の現在 Cura 追従、各ウインドウの位置・表示状態の保存を接続した。
- セッションポリシーに従い、引き継ぎ後の単体・統合・起動テストは実行していない。静的差分監査のみ実施した。
