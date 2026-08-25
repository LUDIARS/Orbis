# スタート画面と入力の自動判定 (URL / 検索)

要求 (2026-08-25): 新しいセッションを開くときに検索文字または URL を入力できるようにし、
自動判定とボタンによる明示切替を提供する。既存のアドレスバーにも同じ入力方式を適用する。

- `SPEC-ORBIS-P7-START-SCREEN`: 新規 Cura / page で行き先入力を表示し、URL / 検索の自動判定と明示切替を renderer から検証済み IPC 境界を通じて実行する。

## 実装

- `src/shared/navigation-intent.ts` — 入力 1 行を URL か検索語かに振り分ける純粋ロジック。
  明示 HTTP(S) スキーム / スキーム省略の host / localhost / IPv4 は URL、空白を含むもの・TLD らしさが
  無いもの・先頭 `?` は検索。迷ったら検索へ倒す (打ち間違いを URL として開くより取り返しがつく)。
  モードは `auto` / `url` / `search` で、ボタンで固定できる。
- 新しい Cura (= 新しいセッション) と `page.new` は既定 URL (example.com) を開かず、
  アクティブページ無しの状態にしてスタート画面を出す。`DEFAULT_URL` は削除。
- `CuraWindowFactory.navigate` がモードを受け取り、検索なら Google の検索 URL へ。
  アクティブページが無い状態からの入力は新規ページとして開き、`page.new` 由来なら
  親ページとの newview エッジを Nexus に残す。
- 検索 URL の組み立ては `src/main/forma/sites/google/search-url.ts` に一本化 (Exploratio と共有)。
- `StartScreen` (中央の大きな入力欄 + モード切替 + 何が起きるかの説明) と、
  同じ `NavigationModeToggle` を載せたアドレスバー。

## 検証

- typecheck 0 / test 99 (`navigation-intent` の 4 件を含む) / build
- 新規プロファイルで起動し、Cura 1・page 0 = 既定ページを開かずスタート画面が出る状態を確認
- 既存プロファイルでも起動し、復元されたページが従来どおり開くことを確認

## 残件

- スタート画面と切替ボタンの見た目はユーザ確認待ち (このセッションでは画面を目視していない)
- 検索エンジンは Google 固定 (Exploratio と同じ制約)
