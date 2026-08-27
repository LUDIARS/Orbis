# Orbis — ボーダーレスページウインドウ操作

- 日付: 2026-08-26
- project code: `Ob`
- 状態: 実装

## 要件

- `SPEC-ORBIS-BORDERLESS-WINDOW`: ページ `BrowserWindow` は OS 標準枠を持たない。
- `SPEC-ORBIS-BORDERLESS-CONTROL-MENU`: 右上のコントロールをタップすると、ナビゲーション、URL/検索、常に手前、最小化、最大化、閉じる操作を同じ制御帯へ展開する。
- `SPEC-ORBIS-BORDERLESS-CONTROL-DRAG`: コントロールは 6px 未満をタップ、6px 以上をウインドウ移動として扱う。
- `SPEC-ORBIS-BORDERLESS-WEBVIEW-DRAG`: WebContentsView はリンク、入力、文字、メディア、canvas、明示的な操作要素を除いた空背景だけをドラッグ候補にする。閾値到達前はページイベントを妨げない。
- `SPEC-ORBIS-BORDERLESS-WINDOW-DRAG`: preload からの座標は型・範囲・送信元ウインドウを main process で検証し、開始時のウインドウ位置を基準に移動する。

## 責務境界

- renderer: メニュー表示とタップ／ドラッグ判定。
- page preload: 外部ページ上の安全なドラッグ候補判定。
- IPC handler: 信頼済み sender と座標の検証、BrowserWindow の移動。
- action registry: メニューから実行する一回性のウインドウ操作。

## 完了条件

- ページウインドウが frameless で生成される。
- コントロールのタップとドラッグが相互に誤発火しない。
- Web ページのリンク、フォーム、テキスト選択、メディア操作をドラッグ開始が奪わない。
- IPC listener と sender cleanup がアプリ終了・renderer 破棄の両経路にある。
