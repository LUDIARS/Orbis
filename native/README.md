# Orbis native host

操作 UI は Tela/Pictor、Web ページは CEF の Windows 子 HWND で描画します。
Electron/Node.js を実行時に必要としません。現在の操作は戻る・進む・再読込と
URL 表示です。URL 入力、タブ、関心・履歴グラフ、既存データと Vinculum は移行タスクです。
このホストのビルド成功は既存 Orbis 全機能の移行完了を意味しません。

## ビルド

Windows x64、Visual Studio 2022、CMake 3.24 以降を使用します。
`cef-sdk.json` の公式 SDK を取得してサイズと SHA-1 を照合し、展開します。
CEF 本体は変更しません。`cmake --install` で配置した Tela（Pictor 有効）も必要です。
Pictor/Tela と CEF wrapper の CRT は Release `/MD` に統一してください。

```powershell
node scripts/build-native.mjs --cef-root C:/SDK/cef --tela-prefix C:/SDK/tela --pictor-lib C:/SDK/pictor/pictor.lib
```

出力は `build-native/Release/orbis_native.dll` と同名の CEF bootstrap EXE、
CEF の DLL・リソース・ライセンスです。Windows sandbox を維持するため、
アプリは CEF 152 の bootstrap が読み込む DLL としてビルドします。

## 起動契約

起動引数: `--font=<TrueTypeフォント> --profile=<専用の絶対パス> --url=https://example.com`。
URL 省略時は `about:blank`。既存 Electron のプロファイルを指定しないでください。
起動は Concordia の testing claim 後、Excubitor の `orbis-native` を利用し、
Orbis 本体フォルダからのみ行います。worktree の実行ファイルは起動しません。
検証後は release します。

## 実動作の受入項目

- Tela ボタンが CEF の履歴と再読込に作用し、Web 側へ同じクリックが流れない。
- Web 側の IME・選択・スクロール、サイズ変更・DPI・最小化と復帰を確認する。
- ポップアップと外部プロトコルが未管理ウインドウを作らない。
- 閉じる際に beforeunload の取消を尊重し、終了確定後は全 CEF 子プロセスが終了する。
- 待機時の CPU/GPU と再開時の描画を測定する。

配布前には CEF/Chromium のライセンスを同梱し、コード署名と更新追従を整備します。
参考: https://chromiumembedded.github.io/cef/sandbox_setup.html
