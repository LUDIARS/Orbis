---
task: cef-domain-migration
project: Orbis
kind: 実装
created: 2026-09-08
memory_links:
  - spec/feature/tela-cef-browser.md
---
# Orbis ドメイン機能を CEF ホストへ移行

## 目的
関心・ページ・履歴グラフ・Habitus・ウインドウ操作を新ホストへ接続する。

## 完了条件
- 既存データを保全し、Cura/Tabularium/Nexus の読込・保存が同等に動く。
- partition、エミュレーション、非表示ページ、複数ページとウインドウ操作を移行する。
- Electron 依存部分の機能対応表を埋め、未実装を無言で代替しない。

## スコープ
native/、既存ドメインの境界、データ移行、受入検証。
