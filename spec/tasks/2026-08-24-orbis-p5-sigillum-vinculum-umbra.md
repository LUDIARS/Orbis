# P5 — Sigillum + Vinculum + Umbra + 監査ログ

設計書 §7.2 / §7.3 / §7.5 / §7.6 / §7.7 P5。

## 実装済

- Sigillum (`src/main/sigillum/`): browserSigillum (Cura ごと、起動ごと再発行) / pageSigillum (WebContentsView ごとの独立した安定 ID、`forPage` get-or-create)。プロセス終了・view 破棄時に capability を revoke し、別 client による attach 上書きを拒否。形式 `ob_<cura短縮>_<ulid>` (自前 ULID、`crypto.randomBytes`)。migration 0003 (`sigillum` / `sigillum_log` / `vinculum_config` / page 単位本文テーブル + `page.umbra` 列)。アドレスバー右端のスタンプから pageSigillum をコピー。
- Vinculum (`src/main/vinculum/`): loopback (127.0.0.1) 限定 MCP サーバ、ポートは OS 採番して `<userData>/vinculum.json` へ。共有トークンは初回起動時に生成し `vinculum_config` に保存 (env に置かない)、constant-time 比較。stateless StreamableHTTP (リクエストごとに transport/server を生成、request body は 1 MiB 上限、attach 所有者の識別には必須の `x-orbis-client-id` を使用)。tools = attach / navigate / open / read / act / logs / detach (+ search / toMemoria / reveal は `not_implemented` スタブ)。`orbis_open` が返す pageSigillum は同一クライアントへ自動 attach。act は CDP (`webContents.debugger`) の click / type / scroll / select (scroll は `Input.dispatchMouseEvent(mouseWheel)` が compositor の ack 待ちで返らないため `Runtime.evaluate` の `window.scrollBy`)。read mode=screenshot は `Page.captureScreenshot({fromSurface:false})` を先に試し (5 秒で打ち切り)、駄目なら `capturePage` に落とす。全 tool 呼び出しを `sigillum_log` に actor (`cc:<clientId>`) 付きで記録し、本文・DOM・画像・credential・URL query は保存しない。
- Umbra (`src/main/umbra/` + window-factory): `orbis_open({visible:false})` の WebContentsView をウインドウに attach せず保持、タブ一覧には出さない。上限 20 を超えたら古い順に view を閉じる (page 行と Nexus ノードは残す)。GraphPane に半透明ノード、ノードクリックで reveal (actor=user で監査ログ)。再起動後は umbra ページを view 復元せず、ノードクリックで再オープン。
- Nexus: LLM 遷移はエッジ kind=`llm` (GraphPane では点線・紫)。
- 検証クライアント `scripts/vinculum-client.mjs` (E2E: attach→open→navigate→read→logs→detach 実機確認済)。

## 設計からの逸脱

- MCP tool 名は `orbis.attach` でなく `orbis_attach` (Claude/MCP クライアントの tool 名制約 `[a-zA-Z0-9_-]` に合わせた)。

## P6 への残し

- Excubitor `service_detail` による接続元照合 (現状 TODO コメント + 拒否しないフラグ。Cc 側 PR と同時に有効化)。
- `orbis_search` (Exploratio) / `orbis_toMemoria` / `orbis_reveal` の実装 (reveal はユーザ発話 ID 必須)。
- Umbra ページの screenshot (ウインドウへ attach していない view は CDP も compositor も応答しないため空 + note を返す。offscreen 描画での取得)。read mode=a11y。
- console / network 要約の `sigillum_log` への記録 (現状は tool 呼び出しのみ)。
- Cc 側: session への sigillum 紐づけ、`orbis_*` tool の MCP 登録、ユーザ発話 ID の受け渡し (Concordia の別 PR)。

## 実機検証 (2026-08-24)

- typecheck 0 / test 70 / build。`scripts/vinculum-client.mjs` で Umbra 経路 (attach→open(visible:false)→navigate→read(text)→read(screenshot: note)→logs→detach) を通過。
- 可視ページ経路で read(dom) / read(screenshot: 実 PNG) / act(select・type・click・scroll) / 未対応 action のエラー / トークン無し 401 を確認。
