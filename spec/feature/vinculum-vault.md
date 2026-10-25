# Vinculum Vault 連携

対象: Electron 版のみ。関連タスク: `actio:feebc803-7874-4026-9a9f-1278b05e876a`。
正本仕様は [ブラウザ設計 §7.3](../plan/2026-08-24-orbis-browser-design.md#73-vinculum-cc-専用ブリッジ)。

Vinculum は補助ブリッジとして既存の認証、接続元照合、CDP 操作を拡張する。
`auth.ts` は Vault から注入された env の検証、`port.ts` はポート検証、
`input-policy.ts` は入力対象の分類を担当する。既存の Excubitor クライアントと監査を再利用する。
Anatomia の `vinculum` ドメインでこれらの実装を宣言し、`@implements` を仕様 ID へ結び付ける。

## 受け入れ契約

C-1 readToken(env): 正しい形式の環境トークンだけを返し、不備は値を含まないエラーにする
C-2 vinculumPort(env): 1..65535 の整数ポートだけを返す
C-3 verificationEnabled(db,env): env または DB の on で照合を有効にする
C-4 performAct(webContents,action): 操作結果に入力内容を含めず、秘密情報欄への入力を拒否する

## 検証計画

`augur plan --kind security --base main` の計画は `spec/plan/vinculum-vault-test-plan.json`。
入力検証は auth・port の境界値、認可は既存 peer-verification の拒否・監査、
情報漏出は固定エラーと入力値を含まない操作結果を対の単体テストで確認する。
CDP の評価式は VM 内で DOM の代役へ適用し、秘密欄の値が変化しないことを確認する。
起動設定の境界値は HTTP listener のモックで検証する。AI 専用モードの既存 HTTP 単体テストは一時 listener を使うが、Orbis アプリ・管理サービスは起動しない。
契約は実装前に宣言し、Augur contract-wrap で観測する。runtime は管理テンプレートのコピーを使う。

## AI 専用モードとの分担

`ORBIS_MODE` 未設定または `human` の人用モードだけが `ORBIS_VINCULUM_TOKEN` と
catalog の `ORBIS_VINCULUM_PORT` を使う。AI 専用モード (`SPEC-ORBIS-AI-ONLY`) は
`ORBIS_AI_CC_TOKEN`、OS 採番のポート、専用 `orbis-ai-only` プロファイルと
その配下の `vinculum.json` を維持する。相互のトークンにフォールバックしない。
人用と AI 専用の同時起動でも AI 側は人用の固定ポートを要求しない。
AI 側の毎回必須の Excubitor 照合・Origin 制限・通信先制限・catalog 項目は保持する。
CDP 共通経路の秘密欄入力拒否は両モードに適用する。

Excubitor の `src/process/topology.ts` は自身の catalog の `excubitor.port` から
`EXCUBITOR_URL` を導出し、`src/process/inject.ts` が全サービスへ注入する。
Orbis は既存 `excubitorBaseUrl` で受け取り、接続先を Orbis の catalog に複製しない。

## 人間が行う設定

Excubitor の「環境変数」タブで `ORBIS_VINCULUM_TOKEN` を登録し、`orbis` と `concordia` に binding する。
AI は実トークンを生成・閲覧・記録しない。サービスの起動・再起動と実接続確認は今回の検証範囲外。
