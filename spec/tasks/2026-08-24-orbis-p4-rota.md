---
task: orbis-p4-rota
project: Orbis
kind: 実装
created: 2026-08-24
---
# Orbis P4 Rota

## 目的

関心グラフを常駐の透明オーバーレイから円状に選択し、直近ページへ素早く到達できるようにする。

## 完了条件

- `SPEC-ORBIS-P4-ROTA`: `Ctrl+Shift+Space` で Rota をグローバルに開き、ホイールまたは矢印で Cura を回転選択できる。
- `SPEC-ORBIS-P4-OVERLAY`: frameless・transparent・alwaysOnTop のウインドウを hide して再利用し、Esc とページ選択で閉じる。Fenestra の最小化対象には含めない。
- `SPEC-ORBIS-P4-SNAPSHOT`: Cura の色・タイトル・Nexus ノード数とページを直近順に送信し、Indagatio FTS のヒットだけへ絞り込める。
- 休眠 Cura は Tabularium のページから復元して前面化し、選択ページを表示する。
