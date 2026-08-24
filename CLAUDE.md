# Orbis — 実装ルール

- 設計の正本は `spec/plan/2026-08-24-orbis-browser-design.md`。命名 (Radix/Cura/Nexus/Habitus/Forma/Comparatio/Gestus/Clavis/Rota/Fenestra/Indagatio/Tabularium/Sigillum/Vinculum/Umbra/Exploratio) はディレクトリ名・ドメイン名にそのまま使う。
- Chromium にパッチを当てない (zero-patch)。`patches/` を作らない。Electron private API 禁止。
- Vite + React + TypeScript。1 ファイル 1 責務 (SRP)。1 アクション 1 ファイル。
- 変更はブランチ → Revisor local PR。main 直 push 禁止。
- Anatomia ドメインは `spec/domains/` に宣言する。
