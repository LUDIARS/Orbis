# P6 — Exploratio / reveal / toMemoria / accessibility / audit

## 目的

Cc からの探索結果を Nexus に `explore` エッジとして残し、Umbra の明示 reveal、Memoria 委譲用抜粋、アクセシビリティ読取と要約監査を提供する。

## 完了条件

- `orbis_search`、`orbis_toMemoria`、`orbis_reveal` が MCP で利用できる。
- `a11y` 読取は CDP AX tree を上限付きで返す。
- 探索エッジは GraphPane で破線表示される。
- console/network の本文を保存せず要約監査する。

## 設計上の残件

- Excubitor `service_detail` の呼出し契約がこのリポジトリに未提供のため、接続元照合は既存どおり advisory（loopback・共有トークン必須）のままとする。
- GraphPane の停止操作と Habitus 永続設定は Cc の探索ジョブ状態 API が未定義のため、この PR には含めない。探索上限は安全側の固定値（8 ページ・30 秒）で適用する。
- robots.txt のネットワーク取得は依存を増やさずに安全なキャッシュ・失敗時ポリシーを定義できないため、実装していない。Forma の `disallowAutomation` は探索開始時とリダイレクト時に強制する。
- 探索 URL は private/loopback の IP リテラルとローカル向けホスト名を拒否するが、DNS 解決後のアドレス検証と DNS rebinding 対策は Chromium の要求単位で強制できる経路が未設計のため未実装。
- サイト別セレクタを持つ検索エンジンは Google のみであり、未知の `engine` や任意 URL は拒否する。
