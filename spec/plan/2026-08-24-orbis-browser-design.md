# Orbis — 用途別スタイル切替ブラウザ 設計書

- 日付: 2026-08-24
- 依頼: neco「用途別にそれぞれ違うスタイルをとれるブラウザサービス」
- 状態: 設計 (製品名・内部モジュール名決定 2026-08-24、Anulus シェル追補 2026-08-25)
- 略称: `Ob` (Orbis) — PROJECT-CODES.md で未使用を確認済

## 0. 命名 (ラテン語)

| 名称 | 意味 | 役割 |
|---|---|---|
| **Orbis** | 円・世界 | 製品名。関心ごとに世界 (Orbis) を持ち、円状のロールで巡るブラウザ (副題: Orbis Curarum) |
| **Radix** | 根 | Chromium 基盤層。Electron の版追従だけを責務にする |
| **Cura** | 関心事 | 1 グラフ = 1 Cura。Cura ごとに所属するページウインドウ群を切り替える |
| **Nexus** | 結び目・連結 | ページ遷移グラフ (ノード=ページ、エッジ=遷移/参照) |
| **Habitus** | 様態・装い | 用途別スタイルプロファイル (モバイル確認 / 買い物比較 / 通常) |
| **Forma** | 型 | サイト別ページ最適化 (Amazon 等の CSS/JS 注入) |
| **Comparatio** | 比較 | 買い物用の商品比較検討ビュー |
| **Gestus** | 身振り | マウスジェスチャ |
| **Clavis** | 鍵 | キーボードショートカット |
| **Rota** | 車輪 | グラフロール (関心を円状に表示して選ぶオーバーレイ) |
| **Fenestra** | 窓 | ウインドウ制御 (AlwaysOnTop / 全最小化 / 透明化) |
| **Indagatio** | 探索 | グラフ横断のページ検索 |
| **Tabularium** | 文書庫 | 永続化 (SQLite) |

## 1. 要件整理

| # | 要件 | 対応モジュール |
|---|---|---|
| R1 | Chromium ベース、更新をいち早く取り込む | Radix |
| R2 | PC のみ (Windows / macOS / Linux。neco 決定 2026-08-24) | Radix |
| R3 | グラフで関連ページの遷移と検索 | Nexus, Indagatio |
| R4 | 1 グラフ = 1 関心、1 ページ = 1 独立ウインドウ | Cura, Fenestra, Anulus |
| R5 | モバイル UA + モバイルサイズ / 買い物比較 / Amazon 最適化 | Habitus, Forma, Comparatio |
| R6 | マウスジェスチャ・ショートカットを自在に設定 | Gestus, Clavis |
| R7 | ショートカットで「グラフロール」 | Rota |
| R8 | AlwaysOnTop / AlwaysOnTop 以外を全最小化 / 透明化 のショートカット | Fenestra, Clavis |

## 2. 基盤方針 (R1/R2) — Chromium をフォークしない

### 判断
**Electron を採用し、Chromium 本体へのパッチをゼロにする (zero-patch policy)。**
全機能をシェル層 (main process + preload + renderer UI) で実装し、Chromium 更新は `electron` の依存版更新 1 コミットで済む状態を保つ。

### 比較 (decision-metrics 4 軸)

| 案 | AI 学習量 | 作業コスト | 目的達成度 | 主目的一致 |
|---|---|---|---|---|
| A. Chromium フォーク + パッチ | 大 (ビルド系・パッチ保守) | 極大 (1 ビルド数時間、更新ごとに rebase) | 高 | 低 (R1 と正面衝突) |
| B. CEF | 中 | 大 (C++ ホスト、UI 自前) | 中 | 中 |
| **C. Electron (zero-patch)** | 小 (TS のみ) | 小 (依存 bump) | 高 (R3〜R8 は全て Electron API で到達可) | **高** |
| D. Chrome 拡張 + Native Host | 小 | 小 | 低 (AlwaysOnTop・透明化・ウインドウ単位 UA が不可) | 低 |

### 追従の具体策
- **脆弱性対応速度を優先 (neco 決定 2026-08-24)**: Electron stable の Chromium セキュリティ修正は通常 1 週間以内にパッチ版 (x.y.Z) として出るので、これを最速で取り込む。Radix 追従ジョブ = (1) Electron の GitHub Releases と Chromium Security Advisory を日次で監視し、CVE を含むパッチ版が出たら即 bump PR (deps-sweep の枠組み)、(2) メジャー bump は `electron-nightly` / beta で smoke E2E (Nexus / Habitus / Fenestra / Vinculum) を先行して回し、stable 化当日に bump できる状態を保つ。EOL (直近 3 メジャー外) は CI を fail にする。
- 禁止事項: `patches/` ディレクトリを作らない。Electron の private API に依存しない。Chromium 内部挙動に依存する機能は preload 側で feature-detect する。

### 技術スタック
- Electron (最新 stable) / TypeScript / Node 22
- ウインドウ内のページは **WebContentsView** (BrowserView 後継) を 1 ページ 1 view で保持
- UI (グラフ、Rota、設定) は Electron renderer の SPA: **Vite + React + TypeScript** (LUDIARS 既存 = Corpus / Iter / VOB と同じ。neco 決定 2026-08-24)。状態は zustand、スタイルは CSS Modules
- グラフ描画: Cytoscape.js (力学レイアウト + 検索ハイライト)
- 永続化: SQLite (Tabularium)。 Node/Electron 同梱の `node:sqlite` を使う (better-sqlite3 は Electron ABI 再ビルドが vitest と衝突するため P0 で不採用)
- テスト: vitest (単体)、Playwright for Electron (E2E)

## 3. アーキテクチャ

```
┌──────────────── main process ──────────────────┐
│ Radix      … app lifecycle / electron bump 境界  │
│ Cura       … 関心の CRUD, Cura <-> page windows  │
│ Nexus      … グラフ状態 (in-memory) + イベント   │
│ Habitus    … session partition / UA / 画面寸法   │
│ Forma      … サイト別注入スクリプト登録           │
│ Gestus     … ジェスチャ認識 (座標列 -> アクション)│
│ Clavis     … shortcuts + アクション束縛           │
│ Fenestra   … AlwaysOnTop / minimizeOthers / opacity│
│ Rota       … オーバーレイ window の表示制御       │
│ Indagatio  … Tabularium への FTS 検索             │
│ Tabularium … SQLite: cura/page/edge/visit/binding │
└──────────────┬─────────────────────────────────┘
        IPC (typed, contextIsolation)
┌──────────────┴──────┐   ┌──────────────────────┐
│ preload (per page)  │   │ renderer UI (SPA)     │
│ - navigation report │   │ - GraphPane (Nexus)   │
│ - mouse trail→Gestus│   │ - RotaOverlay         │
│ - Forma script host │   │ - HabitusSwitcher     │
└─────────────────────┘   │ - SettingsPane        │
                          └──────────────────────┘
```

### アクション抽象 (Gestus / Clavis 共通)
入力 (ジェスチャ/キー) は必ず **Action ID** に解決してから実行する。Action は `actions/` に 1 ファイル 1 アクションで登録。
```
type ActionId = "page.back" | "page.forward" | "page.close" | "cura.new" | "cura.switch"
  | "rota.open" | "fenestra.alwaysOnTop.toggle" | "fenestra.minimizeOthers"
  | "fenestra.opacity.cycle" | "habitus.set:<id>" | "indagatio.open" | ...
```
ユーザ設定 = `{ trigger: GestureSpec | KeySpec, action: ActionId, args? }` の配列。設定 UI と JSON 直編集の両方を許す。

## 4. モジュール設計

### 4.1 Cura (関心) と Fenestra (ウインドウ)
- `Cura { id, title, color, habitusId, createdAt, lastActiveAt }`
- Cura はウインドウではなく、Nexus グラフと所属ページウインドウ群をまとめる論理単位。最終シェル構成は §10 に従う。
- 1 ページに 1 `BrowserWindow` + `WebContentsView`。Nexus グラフは独立した Speculum ウインドウに表示する。
- Cura を跨ぐページ移動 (ドラッグ or アクション `page.moveToCura`) を用意。
- Cura の切替では所属ウインドウ群を畳み、グラフは Tabularium に残す。Cura の削除は明示操作のみ。

### 4.2 Nexus (グラフ)
- ノード: `Page { id, curaId, url, title, favicon, thumbnail, firstVisit, lastVisit, pinned }`
- エッジ: `Edge { from, to, kind: navigate | newview | manual, count, lastAt }`
- 遷移の取得: `did-navigate` / `did-navigate-in-page` / `setWindowOpenHandler` から親ページを解決してエッジ化。URL は正規化 (tracking パラメータ除去ルールは Forma 側で持つ) して同一ノードに集約。
- レイアウト: 力学 + 時系列の 2 モード。ノードクリックで対応 view をフロントへ。
- Chromium 標準の履歴には触らない。Nexus は「関心内の構造」だけを持つ。

### 4.3 Habitus (用途別スタイル)
| Habitus | UA | 寸法 | partition | 付随 |
|---|---|---|---|---|
| `desktop` (既定) | 標準 | 自由 | `persist:desktop` | — |
| `mobile` | iOS Safari / Android Chrome (選択) | 390x844 等プリセット + DPR | `persist:mobile` | `Emulation.setDeviceMetricsOverride` + touch emulation を debugger API で適用 |
| `shopping` | 標準 | 自由 | `persist:shopping` | Comparatio パネル ON、Forma(amazon 等) ON |
- Habitus は Cura 単位に既定を持ち、ページ単位で上書き可。同じ partition 内の切替は view を維持して
  UA/emulation を再適用し、partition が変わる切替では同じ URL の view を対象 partition で作り直す。
- Cookie 分離は partition で担保 (買い物用ログインを通常閲覧と混ぜない)。

### 4.4 Forma (サイト最適化) と Comparatio (比較)
- Forma = `{ id, match: URLPattern, css?, js?, habitus?: HabitusId[] }`。`forma/sites/amazon/` のように 1 サイト 1 ディレクトリ。注入は `insertCSS` / preload 経由 (contextIsolation の世界分離を守る)。
- Amazon 用 Forma 初期セット: スポンサー枠の減衰、価格/評価/送料/到着日を 1 行に正規化、「比較へ追加」ボタン。
- Comparatio = Cura 内の商品ノードを表にする横断ビュー。列 (価格・評価・レビュー数・到着日・URL) は Forma が抽出した `ProductFacts` を使う。Forma が無いサイトはタイトル+URL のみ。

### 4.5 Gestus (マウスジェスチャ)
- preload が右ボタン押下中の座標列を main に送る。`gestus/recognizer.ts` が 8 方向ストローク列 (`DR`, `LU` 等) に量子化 → 設定表で Action へ。
- 誤発火対策: 最小移動距離・タイムアウト。右押し + ホイールは別トリガ。
- 認識中はオーバーレイでストローク軌跡と候補アクション名を表示。

### 4.6 Clavis (ショートカット)
- ウインドウ内: `before-input-event` で捕捉 (ページの JS に食われない)。
- グローバル (非フォーカスでも効く): `globalShortcut`。R8 の 3 つは既定でグローバル。
- 既定表 (全て変更可):

| 既定キー | Action |
|---|---|
| `Ctrl+Shift+Space` | `rota.open` |
| `Ctrl+Shift+T` | `fenestra.alwaysOnTop.toggle` |
| `Ctrl+Shift+M` | `fenestra.minimizeOthers` (AlwaysOnTop 以外を最小化) |
| `Ctrl+Shift+O` | `fenestra.opacity.cycle` (100→70→40→100%) |
| `Ctrl+Shift+N` | `cura.new` |
| `Ctrl+Shift+F` | `indagatio.open` |
| `Ctrl+Shift+H` | `habitus.cycle` |

### 4.7 Rota (グラフロール)
- 常駐の透明 frameless オーバーレイ window (画面中央、AlwaysOnTop、呼出時のみ表示)。
- 中央に Cura を円状配置 (色+タイトル+ノード数)。ホイール/矢印で回転、Enter/クリックで選択。
- 選択後、右側にその Cura のページ一覧 (直近アクセス順、サムネ付き)。インクリメンタル検索欄は Indagatio に接続。
- Esc で閉じる。マウスが外へ出ても閉じない (キーボード操作前提)。

### 4.8 Fenestra (ウインドウ制御)
- `alwaysOnTop.toggle`: 対象ページウインドウへ `setAlwaysOnTop(!cur, "floating")`。状態をページ単位に保存。
- `minimizeOthers`: ページウインドウのうち `isAlwaysOnTop() === false` を `minimize()`。Anulus / Speculum / Rota は対象外。
- `opacity.cycle`: 対象ページウインドウへ `setOpacity()`。Windows/mac で有効。Linux は Electron が未対応のため代替として「AlwaysOnTop + 縮小表示」に自動フォールバック (設定で無効化可)。
- 状態遷移は `fenestra/state-machine.ts` に集約し、ショートカット側は Action 経由でしか触らない。

### 4.9 Indagatio (検索) / Tabularium (永続化)
- SQLite: `cura`, `page`, `edge`, `visit`, `product_facts`, `binding` (Gestus/Clavis 設定), `habitus`。
- `page` に FTS5 (title, url, 本文抜粋 = preload が `innerText` 先頭 2KB を送る)。
- 検索結果はグラフ上でハイライト + Rota の一覧にも反映。

## 5. リポジトリ構成 (SRP / ファイル分割)

```
Orbis/
  package.json            electron, cytoscape, vite (SQLite は node:sqlite)
  src/main/
    radix/                bootstrap, single-instance, updater 境界
    cura/                 service.ts, repository.ts, window-factory.ts
    nexus/                graph-store.ts, navigation-tracker.ts, url-normalizer.ts
    habitus/              service.ts, presets/{desktop,mobile,shopping}.ts, emulation.ts
    forma/                registry.ts, injector.ts, sites/amazon/{index,facts-extractor}.ts
    comparatio/           service.ts
    gestus/               recognizer.ts, bindings.ts
    clavis/               local-shortcuts.ts, global-shortcuts.ts, bindings.ts
    fenestra/             state-machine.ts, actions.ts
    rota/                 overlay-window.ts
    indagatio/            search.ts
    tabularium/           db.ts, migrations/, repositories/
    actions/              registry.ts + 1 アクション 1 ファイル
    ipc/                  channels.ts (typed), handlers/
  src/preload/            page-bridge.ts, forma-host.ts
  src/renderer/           GraphPane/, RotaOverlay/, HabitusSwitcher/, Settings/, Comparatio/
  spec/domains/           Anatomia ドメイン宣言 (モジュール名をそのままドメインに)
  test/ e2e/
```

## 6. 実装フェーズ (フルセット前提、MVP 縮小はしない)

| Phase | 内容 | 完了条件 |
|---|---|---|
| P0 | Radix + Tabularium + Cura/Fenestra 骨格、Electron 追従 CI | 1 Cura 1 window で閲覧でき、`electron` bump PR が自動で立つ |
| P1 | Nexus + Indagatio + GraphPane | 遷移がグラフ化され、検索でノードがハイライト・フォーカスされる |
| P2 | Habitus + Forma(amazon) + Comparatio | mobile 切替で UA/寸法/touch が効く、Amazon で比較表が出る |
| P3 | Clavis + Gestus + 設定 UI | 既定表通りに動き、設定 UI から再束縛できる |
| P4 | Rota + Fenestra 3 ショートカットのグローバル化 | Ctrl+Shift+Space で円状 UI → Cura → ページ到達 |

各 Phase は Revisor local PR 1 本ずつ。Anatomia ドメインは P0 で全モジュール分を先に宣言する。

## 7. Concordia 連携 (LLM 操作) — 追加要件 2026-08-24

### 7.0 命名 (追加)

| 名称 | 意味 | 役割 |
|---|---|---|
| **Sigillum** | 印章 | 論理ブラウザ (Cura) / ページごとのセッション ID。Cc へ渡す鍵 |
| **Vinculum** | 絆・つなぎ | Cc 専用の API/MCP ブリッジ。一般公開しない |
| **Umbra** | 影 | ウインドウへ attach していない非描画ページの状態。LLM の新規ページは既定で Umbra、既存ページも配置上限超過時に一時的に遷移 |
| **Exploratio** | 偵察・探索 | 自動検索。クエリ→結果→遷移をグラフ上に可視化しながら進める |

### 7.1 要件

| # | 要件 | 対応 |
|---|---|---|
| R9 | 各ブラウザにセッション ID を持ち、Cc に渡すと「このページを LLM の操作対象にする」「このページのログを確認する」ができる | Sigillum, Vinculum |
| R10 | 「自動検索」を可視化して実装 | Exploratio, Nexus |
| R11 | API/MCP として接続。自動遷移・ページ内容確認・Memoria への転送 | Vinculum |
| R12 | Cc のみと連携。一般 API として公開しない | Vinculum (認証・バインド) |
| R13 | LLM 操作時の新規ページは非描画。ユーザ操作/指示で初めて可視化 | Umbra |
| R14 | ページウインドウはボーダーレス。右上コントロールはタップでメニュー、ドラッグで移動し、閲覧面の空背景からも移動できる | Fenestra, Cura |

### 7.2 Sigillum (セッション ID)
- 2 階層: `browserSigillum` (Cura = 1 論理ブラウザに 1 つ、起動ごとに再発行) と `pageSigillum` (WebContentsView ごと、安定 ID)。
- 形式: `ob_<cura短縮>_<ulid>`。UI ではアドレスバー右端のスタンプアイコンからコピー / Cc へ直接送信 (`vinculum.attach`) できる。
- 「操作対象にする」= Cc 側で `sigillum` を task/session に紐づける (Cc の PATCH /v1/sessions/:id 拡張、既存の repo rebind と同じ流儀)。
- Tabularium に `sigillum` テーブル (id, kind, curaId, pageId, issuedAt, attachedTo: ccSessionId?) を持ち、ログ (§7.5) の主キーにする。

### 7.3 Vinculum (Cc 専用ブリッジ)
- 実体: Orbis main process 内の **MCP サーバ (stdio/loopback)** + 補助 HTTP (loopback のみ)。ポートは Excubitor catalog に登録し固定しない (port-source-rule)。
- 接続制限 (R12):
  - loopback 以外は bind しない
  - Cc がヘルスチェック時に提示する共有トークン (Cc の設定 UI/DB 1 系統から発行、env には置かない) を必須
  - 接続元プロセスが Excubitor 管理下の Concordia であることを Excubitor `service_detail` で照合 (照合不能なら拒否)

#### SPEC-ORBIS-P6-VINCULUM-PEER: 接続元照合の段取り (既定 OFF)

照合は Cc が自分の Excubitor `instance_id` を `x-orbis-instance-id` で名乗り、
Orbis が Excubitor `GET /api/v1/services/concordia` の `instance_id` と突き合わせる形で行う。

**既定は OFF** (neco 判断 2026-09-04)。 名乗る側は Cc の変更で入るため、
先に fail-closed を既定にすると、まだ名乗っていない Cc からの接続が全部 401 になり
Cc ↔ Orbis のリンクが切れる。 Cc 側が入ってから `vinculum_config` の
`excubitor_verification` を `'on'` にする。 `'on'` 以外の値と未設定は OFF —
設定ミスで黙って fail-closed に倒れると、原因が 401 だけから読み取れない。

ON のときは **照合不能も拒否**する。 Excubitor に届かない・Concordia が
`running` でない・`instance_id` を持たない・値が食い違う、のいずれも
「Excubitor 管理下であることを確認できない」であり、確認できないものを通すなら
照合を入れる意味が無い。

判定は `vinculum_access_log` (migration 0007) に残す。 `sigillum_log` は
sigillum への外部キーを持つので、まだ sigillum を持たない「接続を拒否した」記録を
入れられない。 拒否が残らないと、照合が効いているのか誰も接続していないだけなのかを
後から区別できない。 残すのは判定・理由・client id だけで、提示された instance_id や
トークンは残さない。認証前のローカル要求による無制限な DB 増加を避けるため、
直近 10,000 件を保持する。

接続先 origin は Excubitor / ProcessMap 側が env (`ORBIS_EXCUBITOR_URL` / `EXCUBITOR_URL`)
で渡し、Orbis 側にはポートを複製しない。path/query/credential を含む値と未設定は
照合不能として拒否する。
prefix は `/api/v1/` — `/v1/` と `/api/` は 404 (2026-09-04 実測)。
  - OpenAPI/MCP manifest を外部に出さない。Corpus/Hub には登録しない
- ツール群 (MCP tool、全て `sigillum` 引数必須):

| tool | 内容 |
|---|---|
| `orbis.attach(sigillum)` | 操作対象に登録、以後の操作を許可。ユーザ側にバッジ表示 |
| `orbis.navigate(sigillum, url)` | 自動遷移。エッジ kind=`llm` で Nexus に記録 |
| `orbis.open(sigillum, url, {visible:false})` | 新規ページ。既定は Umbra (非描画) |
| `orbis.read(sigillum, {mode: text \| dom \| a11y \| screenshot})` | ページ内容の確認。screenshot は Umbra では offscreen 描画で取得 |
| `orbis.act(sigillum, action)` | click / type / scroll / select (CDP 経由。Forma の ProductFacts も返せる) |
| `orbis.search(sigillum, query, {engine, depth})` | Exploratio を起動 (§7.4) |
| `orbis.logs(sigillum, {since})` | 遷移/操作/コンソール/ネットワーク要約ログ |
| `orbis.toMemoria(sigillum, {kind: note \| task, ...})` | ページ抜粋を Memoria へ転送 (Memoria API は Orbis から直接叩かず、Cc の既存 Memoria 経路へ委譲) |
| `orbis.reveal(sigillum)` | Umbra → 可視化 (ユーザの指示があった場合のみ Cc から呼べる。§7.6) |
| `orbis.detach(sigillum)` | 解除 |

- 内部構成: `src/main/vinculum/{server.ts, auth.ts, tools/<1 tool 1 file>, audit.ts}`。tools は §3 の Action 抽象を再利用し、人間の操作と同じ経路で実行する (LLM 専用の裏口を作らない)。

### 7.4 Exploratio (自動検索の可視化)
- 入力: クエリ、検索エンジン (既定 = 設定の Habitus に従う)、深さ (結果ページを何段まで開くか)、最大ページ数。
- 動作: 検索結果ページを Umbra で開く → 結果リンクを抽出 → 各リンクを Umbra で開いて `read(text)` → Cc へ返す。すべての遷移を Nexus に **kind=`explore`** のエッジとして記録し、GraphPane では点線+進行中アニメーションで描画。
- 可視化: 検索ノード (クエリを頂点にした星型) がグラフ内で成長していく。Umbra ノードは半透明で描画し、「表示」ボタンで可視化 (= reveal)。
- 停止・上限: ユーザは GraphPane から即停止できる。ページ数・時間の上限は設定 (`exploratio.maxPages`, `maxSeconds`) を持ち、Cc 側の要求より小さい方が勝つ。
- robots.txt を尊重し、Forma が「自動アクセス禁止」を宣言したサイトは開かない。

### 7.5 監査ログ (R9 「このページのログを確認する」)
- `sigillum_log` テーブル: (sigillum, at, actor: user \| cc:<sessionId>, kind: navigate \| act \| read \| reveal \| search \| console \| network, payload)。
- LLM の操作は必ず actor 付きで残す。GraphPane のノード詳細と `orbis.logs` の両方から同じレコードを引く。
- console/network は要約 (status, url, ms) のみ。本文は保存しない。

### 7.6 Umbra (非描画ページ)
- `orbis.open` で作る WebContentsView は **ウインドウに attach せず** (offscreen 状態) 保持。描画コストを避けるため `backgroundThrottling` を有効、`offscreen: true` は screenshot 要求時だけ一時的に使う。
- 可視化の条件 (どちらか):
  1. ユーザ操作: GraphPane の半透明ノードをクリック / Rota から選択
  2. ユーザ指示: Cc に「見せて」と言った結果として Cc が `orbis.reveal` を呼ぶ。Vinculum はこの呼び出しに **Cc 側のユーザ発話 ID** を要求し、無ければ拒否 (LLM の自律判断だけでは可視化できない)
- 可視化 = 対象 view 用の独立したページウインドウを作ってフロントへ出す。Umbra 中もセッション/Cookie は Habitus の partition を共有する (ログイン状態を引き継ぐ)。
- Umbra ページ数の上限 (既定 20) を超えたら、LLM が非描画で新規作成した未固定ページだけを古い順に破棄し、Nexus にはノードを残す。Dispositio が畳んだ既存ページは自動破棄しない。

### 7.7 フェーズへの追加

| Phase | 内容 | 完了条件 |
|---|---|---|
| P5 | Sigillum + Vinculum (attach/navigate/open/read/act/logs/detach) + Umbra + 監査ログ | Cc の delegation から sigillum を渡して非描画で遷移・読取ができ、ユーザ操作で可視化される |
| P6 | Exploratio + reveal + toMemoria + Cc 側の sigillum バインド UI | 自動検索がグラフ上に点線で伸び、Memoria に転送できる |

Cc 側の対応 (session への sigillum 紐づけ、`orbis.*` tool の MCP 登録、ユーザ発話 ID の受け渡し) は Concordia の別 PR。

## 8. 未決事項 (neco 判断)
1. ~~製品名・内部モジュール名~~ 全て決定 (2026-08-24)。
2. ~~renderer~~ Vite + React + TS で決定 (2026-08-24)。
3. ~~Electron 追従~~ 脆弱性対応最速 (パッチ版即 bump + nightly 先行 smoke) で決定 (2026-08-24)。
4. ~~PC の範囲~~ Windows / macOS / Linux 全対象で決定 (2026-08-24)。Linux は透明化 (opacity) 非対応 → フォールバック (§4.8)。

## 9. 基盤に Tauri を採らない理由 (neco 質問 2026-08-24)

Tauri は **システム WebView** を使う: Windows = WebView2 (Edge/Chromium)、macOS = WKWebView (WebKit)、Linux = WebKitGTK。
Mac/Linux を対象に含めた時点で R1 (Chromium ベース) を満たせない。加えて:

| 観点 | Tauri v2 | Electron |
|---|---|---|
| Chromium 一致 (R1) | Windows のみ。mac/Linux は WebKit | 全 OS 同一 Chromium |
| Chromium 更新の制御 | WebView2 は Edge の更新に従属、自分で bump できない | `electron` 版 bump で制御 |
| 用途別 UA / デバイスエミュレーション (Habitus) | CDP が WebView2 でしか使えず、mobile emulation が OS で挙動差 | debugger API で全 OS 同一 |
| 非描画ページ (Umbra) | offscreen webview なし、ウインドウ非表示で代用 | WebContentsView を attach せず保持、offscreen screenshot 可 |
| AlwaysOnTop / opacity | AlwaysOnTop 可、opacity は OS 依存で Linux/一部 mac が不可 | 同等 (Linux opacity 不可) |
| session partition (Cookie 分離) | data-directory 分離のみ。ページ単位の切替不可 | partition 文字列で view 単位 |
| バイナリ / メモリ | 軽い (これが Tauri の唯一の明確な利点) | 重い (~200MB) |

結論: **Electron 継続**。Tauri の利点は軽さのみで、本製品の中核要件 (Chromium 一致・エミュレーション・非描画・partition) の 4 つで劣る。
なお Tauri + CEF を組む案 (community plugin) は成熟しておらず、結局 CEF 側の追従とホスト実装を自前で持つことになり案 B と同じコストになる。

## 10. Anulus シェル — ウインドウ構成の作り替え (neco 指示 2026-08-25)

### 10.0 きっかけと骨子

neco 指示: 「Electron のメインウインドウは不要。子プロセスのブラウザビュー画面が複数個立ち上がるイメージ。
中央に円ボタンの管理 UI があり、子プロセスのビューはその管理 UI の子供として作られ、エッジを持つ。
バラバラに配置するモード、グラフ状に配置するモード (ビューに表示される数を選べる)、あと最前面や
円に追従して移動するかどうかなどの動きを指定可能」。

これまでの「1 Cura = 1 BrowserWindow、その中に WebContentsView をタブとして重ねる」構造をやめ、
**中央の円 (Anulus) + 独立したビューウインドウ群**へ作り替える。Nexus / Habitus / Forma / Comparatio /
Gestus / Clavis / Sigillum / Vinculum / Umbra / Exploratio の各モジュールは据え置き、
既存のドメインロジックは保ちつつ、シェル (Radix の window 層と renderer)、Fenestra の操作単位、
Tabularium のウインドウ状態、配置計算を置き換える。

### 10.1 命名 (追加)

| 名称 | 意味 | 役割 |
|---|---|---|
| **Anulus** | 環・指輪 | 画面中央に浮かぶ円形の管理 UI。全ビューの管理上の親となる常設ウインドウ |
| **Dispositio** | 配置 | ビューウインドウの配置モード (散開 / グラフ状) と、その計算 |
| **Speculum** | 鏡・見晴らし | Nexus グラフを常設表示する専用ウインドウ (旧 GraphPane の置き場所) |

Rota (車輪) は既存のショートカット起動オーバーレイのままで、Anulus とは別物。

### 10.2 Anulus (円形管理 UI)

- 枠なし・背景透過・常時最前面の小さな円ウインドウ。ドラッグで移動でき、位置は Tabularium に永続化する。
- 中心は **URL / 検索の入力欄**。P7 start screen (`SPEC-ORBIS-P7-START-SCREEN`) と同じ自動判定 (URL か検索語か) とモード切替を持つ。
  ここから開くと新しいビューウインドウが Anulus の子として生まれる。
- 円周には現在のビューが並ぶ。クリックで前面化、ドラッグで配置変更、右クリックでそのビューの挙動設定。
- Cura (関心) の切替も円周から行う。Anulus は常に「いまの Cura」に属するビューだけを並べる。

### 10.3 ビューウインドウ

- 1 ページ = 1 独立ウインドウ (`BrowserWindow` + `WebContentsView`)。タブは廃止する。
- Anulus との親子関係は Cura / Nexus 上の論理的な所有関係とする。OS の owner/child 関係には依存せず、最前面・最小化・追従を個別に制御する。
- 上部に**細いバー**を持つ: 戻る / 進む / 再読込 / URL 表示・入力 / sigillum スタンプ。
  Anulus からも開けるが、そのウインドウ内で行き先を変えたいときはここを使う。
- Umbra (非描画ページ) はウインドウを作らない。可視化 (reveal) された時に初めてウインドウになる。

### 10.3.1 Speculum (常設グラフウインドウ) — neco 決定 2026-08-25

GraphPane は無くさず、**独立した常設ウインドウ**として残す (メインウインドウが消えるため置き場所を移す)。

- 枠なしの 1 枚。Anulus と同じく常設で、閉じるのではなく畳む (Anulus の円周から出し入れする)。
- 他のビューと同じ挙動指定を受ける: 最前面 / 円に追従 / 透明度 / 固定。Dispositio の再配置対象にもなる。
- ノードクリックで対応するビューウインドウを前面化する。Umbra ノードはクリックで reveal (= ウインドウ化)。
- 表示するのは「いまの Cura」のグラフ。Cura を切り替えると中身が入れ替わる。
- 描画は既存の cytoscape 実装 (`src/renderer/GraphPane/`) をそのまま移設し、常設ペインから常設ウインドウへ器だけ変える。

### 10.4 親子関係の見せ方 — 線は引かない (neco 決定 2026-08-25)

ウインドウを跨ぐエッジ線は描かない。代わりに:

- **配置**: Dispositio のグラフ状モードで、親から子へ向かう方向に並べる。
- **近接**: 親子は近く、無関係なものは離す。
- **枠色**: 同じ Cura のビューは同色の細い枠、親子は濃淡で示す。Anulus の円周上の並びと色を一致させる。

透過オーバーレイで線を引く案は、マルチモニタと入力の抜けの扱いが重くなるため採らない。

### 10.5 Dispositio (配置モード)

| モード | 動き |
|---|---|
| `sparsus` (散開) | ウインドウを重ならないよう画面へ散らす。手で動かした位置は尊重し、新規ぶんだけ空き領域へ置く |
| `graphus` (グラフ状) | Nexus の親子に沿って格子/放射状に並べる。**同時表示数 N** を指定でき、溢れたぶんはウインドウを畳んで Umbra 状態にする |

- 同時表示数はビューあたりの負荷に直結するため、Anulus から即変更できるようにする。
- N は現在の Cura のページウインドウだけを数え、Anulus / Speculum は含めない。現在ページと固定された可視ページは必ず残し、N の下限をその重複を除いた枚数とする。残りは最終アクセスの新しい順に残す。
- 配置計算は純粋関数 (`src/main/dispositio/*.ts`) に置き、ウインドウ操作と分離してテストする。

### 10.6 ビューごとの挙動

Anulus の右クリックメニューと設定ペインから、ビュー単位で指定する。既定値は Habitus に持たせる。

| 指定 | 内容 |
|---|---|
| 最前面 | そのビューだけ常時最前面にする (Fenestra の alwaysOnTop をビュー単位へ降ろす) |
| 円に追従 | Anulus を動かしたとき、相対位置を保って一緒に動く |
| 透明度 | 既存 Fenestra の opacity をビュー単位へ |
| 固定 | Dispositio の再配置対象から外す (手で置いた位置を保つ) |

### 10.7 フェーズ

| Phase | 内容 | 完了条件 |
|---|---|---|
| P8 | Anulus 骨格 + ビューウインドウ化 (タブ廃止・細いバー) + Speculum 移設 | メインウインドウ無しで、円から URL/検索を開いて複数ウインドウが並び、常設グラフが出る |
| P9 | Dispositio (sparsus / graphus + 同時表示数) | 配置モードを切り替えると実際に並び替わり、溢れが Umbra へ落ちる |
| P10 | ビューごとの挙動 (最前面 / 追従 / 透明度 / 固定) + 枠色と近接の親子表現 | 円を動かすと追従ビューが付いてくる。同 Cura が同色で見分けられる |

### 10.8 影響と移行

- 削除: `CuraShell` のツールバー・タブ (`PageTabs`)。GraphPane は削除せず Speculum ウインドウへ移設する。
- 据え置き: Nexus / Tabularium / Habitus / Forma / Comparatio / Clavis / Gestus / Vinculum / Umbra / Exploratio。
- Vinculum の `orbis.open` が返す pageSigillum は従来どおり「ページ / WebContentsView 1 つ」に対応する。Umbra にはウインドウがないため、ウインドウ ID を契約へ含めない。
- 既存の `page` テーブルはそのまま使い、Anulus / Speculum / ページのウインドウ位置とビュー挙動は所有種別と所有 ID をキーにした新テーブルへ持つ (migration 0005)。
- 保存する位置は display ID と bounds の組にし、復元時に該当 display がなければ最寄りの `workArea` 内へ収める。マルチモニタ構成変更後も画面外へ復元しない。

## 11. Vitrum 表示調整 — Tier 1 採用決定 2026-08-28

ページの最終描画に対する色調・明暗・反転・ブラー等のビュー単位調整として、Vitrum Tier 1 を
先行実装する。main process で検証した allowlist 形式の `FilterStep` から CSS/SVG フィルタを生成し、
`webContents.insertCSS` / `removeInsertedCSS` の key を Vitrum が所有する。raw CSS / raw SVG は
設定値として受け付けず、Forma が所有する注入 CSS のライフサイクルとは分離する。

ビュー設定を Habitus の既定値より優先し、Tabularium へ永続化する。操作は `vitrum.cycle` Action、
PageControlBar、設定 UI から提供する。詳細な要件・スコープ・完了条件は
`spec/tasks/2026-08-28-orbis-vitrum-tier1.md` を正本とする。任意 GLSL を扱う Tier 2 は未採用であり、
技術検証と対象ページ種別の需要確認後に別途判断する。
