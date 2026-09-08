# Orbis (Orbis Curarum)

関心ごと (Cura) ごとに世界を持ち、ページ遷移をグラフで巡るデスクトップブラウザ。
現行版は Electron + zero-patch Chromium。Windows / macOS / Linux。

2026-09-08 の採用決定により、操作 UI を Tela/Pictor、WebView を CEF/Chromium に移行します。
Windows ネイティブホストのビルドは [native/README.md](native/README.md)、
移行契約と残る機能は [仕様](spec/feature/tela-cef-browser.md)を参照してください。

`npm ci && npm run dev` で起動します。Electron の日次監視は新しい stable を検出すると
`chore/electron-<version>` ブランチを更新済み lockfile とともに作成します。

- 設計書: `spec/plan/2026-08-24-orbis-browser-design.md`
- 略称: `Ob`
