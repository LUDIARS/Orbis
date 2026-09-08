# SPEC-ORBIS-TELA-CEF: Tela UI と CEF WebView

2026-09-08 neco 決定。Orbis の新しいネイティブ実装は Electron を外し、
操作 UI を Tela/Pictor、Web ページを CEF/Chromium が担当する。
`spec/plan/2026-08-24-orbis-browser-design.md` の Electron 採用方針を置き換える。
既存 Electron 版は移行比較用として残し、新実装の完成を装って切り替えない。

## 責務と依存

- Radix: CEF 初期化、サンドボックス、ブラウザプロセスの寿命と版追従。
- Cura/Nexus: 関心・ページ・履歴グラフ。描画基盤に依存しない。
- Fenestra: Tela の宣言 API で操作 UI を構築し、ネイティブウインドウを所有。
- WebView adapter: CEF の子ウインドウをホストのクライアント領域へ配置。
  Web ページの描画、IME、キーボード、選択は CEF が担当する。
- Tela は CEF に依存しない。Orbis の CEF adapter を交換・再利用可能な境界とする。

初期バックエンドは Windows 子 HWND。操作 UI と WebView は領域を分け、
ブラウザ上の入力を Tela に再注入しない。これは Web ページの画素を Pictor で
再描画する方式ではない。将来のオーバーレイ内合成には別途 offscreen adapter が必要。

## ネイティブホストの契約

1. CEF SDK とインストール済み Tela パッケージを CMake から明示指定する。
   Electron や stub への自動代替はしない。SDK バイナリを Git へ保存しない。
2. アプリと CEF 子プロセスは同じ実行ファイルで起動する。CEF sandbox を有効にする。
3. ナビゲーションは http/https/about:blank のみを初期対応とし、外部プロトコルと
   未管理ポップアップを拒否する。Node.js を Web ページへ公開しない。
4. 戻る・進む・再読込を Tela ボタンで描画する。CEF の履歴状態に対して操作する。
5. ウインドウのサイズと DPI を境界で扱う。WebView にホスト領域を越える寸法を渡さない。
6. 終了要求後はブラウザの OnBeforeClose を待ち、その後ホストと CEF を解放する。
7. 待機中の UI はイベント駆動で更新し、固定間隔の再描画ループを持たない。

## 移行の完了条件

ネイティブホストのビルドだけを Orbis 全体の移行完了としない。
Cura/Tabularium/Nexus、Habitus、Fenestra、Vinculum/Sigillum、既存データ移行、
配布とセキュリティ更新追従の同等性を順に確認して既定起動を切り替える。
起動検証は Excubitor 経由・Orbis 本体フォルダのみ。September は今回対象外。

## 参照

- https://chromiumembedded.github.io/cef/general_usage.html
- Tela の `spec/architecture.md` / `spec/contracts.md`
