---
task: tela-cef-native-host
project: Orbis
kind: 実装
created: 2026-09-08
memory_links:
  - spec/feature/tela-cef-browser.md
---
# Tela と CEF のネイティブホスト

## 目的
Electron を必要としない Orbis のブラウザウインドウを作る。

## 完了条件
- SDK の版を固定し、Tela パッケージを利用してビルドできる。
- Tela 操作 UI から CEF WebView の戻る・進む・再読込ができる。
- サイズ変更、DPI、IME、終了時の子プロセス解放を本体で確認する。

## スコープ
native/、CMake、ビルド説明、Excubitor catalog。
