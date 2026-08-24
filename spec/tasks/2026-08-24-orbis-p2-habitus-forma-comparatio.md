---
task: orbis-p2-habitus-forma-comparatio
project: Orbis
kind: 実装
created: 2026-08-24
memory_links:
  - spec/plan/2026-08-24-orbis-browser-design.md
---
# Orbis P2 Habitus / Forma / Comparatio

## 目的

用途別プロファイルを Cura に永続化し、Amazon の買い物表示を最適化して Cura 内の商品比較を提供する。

## 完了条件

- mobile は iPhone UA、390x844、DPR、touch emulation を適用して再読み込みする。
- shopping は Amazon Forma と Comparatio 表を有効化し、商品事実を SQLite に復元可能な形で保存する。
- desktop/mobile/shopping は session partition を分離する。

## 仕様トレーサビリティ

- `SPEC-ORBIS-P2-HABITUS`: Cura 既定とページ単位上書き、UA、emulation、partition を担う。
- `SPEC-ORBIS-P2-FORMA`: URL マッチしたサイトの CSS/preload 注入と Amazon 商品事実の抽出を担う。
- `SPEC-ORBIS-P2-COMPARATIO`: 商品事実の upsert と Cura 内比較表を担う。
- `SPEC-ORBIS-P2-PERSISTENCE`: migration 0002 と再起動後の Habitus/ProductFacts 復元を担う。

Habitus ごとの persistent session には既定 session と同じ権限拒否方針を適用し、用途を切り替えてもページ単位上書きは保持する。ProductFacts は shopping 用 Amazon Forma が有効な送信元ページからだけ受理する。

## 実装上の制約

WebContentsView の partition は生成時にしか指定できない。そのため同一 partition 内の切替は UA と emulation を再適用して reload し、partition が変わる切替だけは view を作り直す。
