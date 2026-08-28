# Orbis — 改善 6 項目 調査・設計 (2026-08-28)

- 日付: 2026-08-28
- 依頼: neco (2026-08-28 Discord 指示)
- 状態: 項目 1〜3・5 = 調査報告 (実装済みの確認)、項目 4 = 設計 (Tier 1 採用決定 2026-08-28)、項目 6 = 調査提案。項目 6 の採否は neco 判断
- 正本設計書: `spec/plan/2026-08-24-orbis-browser-design.md` (以下「設計書」)。採用が決まった項目は設計書へ追補する

---

## 1. ログイン後のセッション継続と操作 — **実装済み**

「何らかのサービスに Login したあとそのセッションを継続しつつ操作を行えるようにしたい」は、
現行実装で既に成立している。

- Habitus の partition は全プリセットが `persist:` (`persist:desktop` / `persist:mobile` / `persist:shopping`) 。
  persistent cookie / localStorage / IndexedDB は**アプリ再起動をまたいで永続**する
  (`src/main/habitus/presets/*.ts`)。有効期限を持たない session cookie の再起動後の扱いはサイトと Chromium の
  セッション復元条件に依存するため、対象サービスごとに確認が必要。
- 人間の操作も LLM の操作も同じ partition を通る。Vinculum の `orbis.open` が作る WebContentsView と、
  `orbis.navigate` が操作するその view も Habitus の partition を使うため (`src/main/cura/window-factory.ts` の
  `preset.partition`)、**可視ウインドウでログインした状態を Umbra ページ・LLM 操作がそのまま引き継ぐ**
  (設計書 §7.6 のとおり)。
- Habitus 間 (desktop ↔ mobile ↔ shopping) は partition が分かれているため引き継がない。これは
  「買い物用ログインを通常閲覧と混ぜない」ための設計意図 (設計書 §4.3)。

同一起動中の継続操作と、永続 cookie 等を使うサイトでの再起動後の継続は追加設計不要。運用上の注意:

- desktop / shopping は Electron Chromium の既定 UA、mobile は iOS Safari の固定 UA を使う。embedded
  browser 判定や UA / Client Hints の整合性を理由にログインを拒むサイトもある。現行 Forma は CSS と
  preload script の注入だけを扱い UA / Client Hints の変更機能は持たないため、必要になった場合は
  Habitus または session の request 境界へサイト別設定を設計・実装し、対象サイトで確認する。

## 2. LLM とウインドウのやりとり — **中核は実装済み、Cc 接続と Orbis 認証強化が残る**

Vinculum (Cc 専用 MCP ブリッジ) は P5/P6 で main 反映済み:

- MCP サーバ (Streamable HTTP、loopback bind のみ、Bearer token は DB 保管、client id は必須かつ形式検証) —
  `src/main/vinculum/{server,auth}.ts`
- tool 10 種 (`attach / navigate / open / read / act / search / logs / toMemoria / reveal / detach`) —
  `src/main/vinculum/tools/` (1 tool 1 file)
- 監査ログ (actor 付き sigillum_log)、CDP 経由の act / screenshot / a11y read、Exploratio
  (Google 検索 → 上限付き巡回 → kind=explore エッジ記録)

残作業 (いずれも設計書 §7 に記載済みの未実装分):

| 残 | 置き場所 |
|---|---|
| Cc session への sigillum バインド (PATCH /v1/sessions/:id 拡張) と `orbis.*` の MCP 登録 | **Concordia 側の別 PR** (設計書 §7.7) |
| `orbis.reveal` が要求するユーザ発話 ID の受け渡し | 同上 (Cc 側供給) |
| 接続元が Excubitor 管理下の Concordia であることの `service_detail` 照合 | Orbis (Vinculum auth 拡張) |
| Exploratio の探索停止 UI・上限設定 UI | Orbis (GraphPane / Settings) |
| robots.txt の取得・判定 | Orbis (Exploratio の main-process 境界) |

したがって実利用のクリティカルパスは、Concordia 側の sigillum バインド/MCP 登録と、設計書 §7.3 が
照合不能時の拒否を求める Orbis 側 `service_detail` 検証の両方。現状の Vinculum は loopback + token で
待ち受けられるが、Cc 専用接続という R12 の認証要件を満たすまでは接続完了とは扱わない。

## 3. ボーダレスウインドウ — **実装済み (main 1584a51)**

タスク `spec/tasks/2026-08-26-orbis-borderless-window-controls.md` は完了し main に入っている:

- ページ BrowserWindow は `frame: false` で生成 (`src/main/cura/page-window.ts`)。
  Anulus / Speculum / Rota も全て frameless (Anulus と Rota は透過付き)。
- 右上コントロール (`•••`): タップ (6px 未満) でナビゲーション・URL/検索・常に手前・最小化・
  最大化・閉じるを制御帯に展開、6px 以上のドラッグでウインドウ移動
  (`src/renderer/WindowControls/PageControlBar.tsx`, `useWindowDrag.ts`)。
- Web ページ側は空背景のみドラッグ候補 (リンク・入力・文字・メディア・canvas を除外)、
  閾値到達前はページイベントを妨げない (`src/preload/window-drag.ts`)。
- 座標は main process で型・範囲・送信元を検証してから移動。

確認した範囲では、ボーダレス挙動に関する未実装項目はない。

## 4. 最終レンダリング結果のシェーダ調整 — 設計 (新モジュール **Vitrum**、Tier 1 採用済み)

### 4.0 命名

| 名称 | 意味 | 役割 |
|---|---|---|
| **Vitrum** | ガラス | ページの最終描画に載せる調整レイヤ。ビュー単位のフィルタ/シェーダ設定 |

### 4.1 前提 (zero-patch 制約)

Chromium の compositor 出力へ任意 GLSL を直接差し込む口は Electron に無い (やるなら Chromium パッチ =
禁止事項)。zero-patch で「最終レンダリング結果」に効かせる経路は 2 つあり、二段構えにする。

### 4.2 Tier 1 (既定): CSS/SVG フィルタ注入

- `webContents.insertCSS` で `html { filter: ... }` をページへ注入する。canvas / video / WebGL を含む
  ルート要素の描画へまとめて適用できる一方、filter は中間サーフェスの生成や全面再合成を伴い得る。
  blur の半径、対象面積、動画解像度によって GPU/メモリ負荷が増えるため「ほぼ無コスト」とは扱わず、
  プリセットごとに負荷を計測する。ルート要素への filter が stacking context や fixed 要素へ与える影響も
  代表サイトで確認する。
- 使える表現: `brightness / contrast / saturate / hue-rotate / invert / sepia / grayscale / blur` に加え、
  SVG フィルタ参照で **feColorMatrix (任意 4x5 色行列)・feComponentTransfer (ガンマ/トーンカーブ =
  LUT 近似)・feConvolveMatrix (シャープ/エッジ等の畳み込み)** まで宣言的に書ける。
  SVG filter は CSS だけでなく参照先 filter 定義の安全な注入が必要で、外部ページ上での参照可否や
  Chromium の描画差も検証する。色調・明暗・反転・ブラーは Tier 1 の主対象とし、ガンマ・シャープは
  検証に通ったプリセットだけを提供する。
- 設定モデル: `VitrumSpec { id, filters: FilterStep[] }` をプリセット (例: `night-invert` /
  `low-stimulus` / `high-contrast` / `sepia-paper`) + カスタムパラメータで持つ。
  `FilterStep` は種類を allowlist 化し、数値範囲を main process で検証して CSS を生成する。raw CSS や
  raw SVG を設定値として保存・注入しない。
  - 適用単位: ビュー単位。既定値は Habitus に持たせる (§10.6 のビュー挙動と同じ流儀)。
  - 永続化: Tabularium 新テーブル `vitrum (ownerKind, ownerId, spec)` (migration)。
  - 操作: Action `vitrum.cycle` と設定 UI の `vitrum.set(specId)` IPC を用意する。プリセットを直接
    Clavis / Gestus に束縛する場合は、動的文字列ではなく登録済みの有限な ActionId として追加する。
- 実装位置: `src/main/vitrum/{service.ts, presets/*.ts}`。Forma はサイト別最適化、Vitrum はビュー単位の
  表示調整という別責務なので、Forma injector に Vitrum の状態を持たせない。CSS key の適用・解除だけを
  汎用ライフサイクル部品へ抽出するか、Vitrum が独立して所有し、互いの CSS を解除しない構成にする。

### 4.3 Tier 2 (opt-in・要技術検証): WebGL 後処理ミラー (任意 GLSL)

- 対象ページを offscreen WebContentsView (paint イベント) で保持し、表示用ウインドウの renderer に
  フレームを転送 → WebGL2 の全画面クアッドに貼り、**任意の fragment shader** (CRT / ブルーム /
  色調 LUT / 歪み) をかけて表示する。入力はウインドウ側で受けて `sendInputEvent` で転送する。
- 得られるもの: GLSL の完全な自由度。代償: フレームの CPU コピーによる負荷と遅延、IME・ポップアップ・
  スクロール体感の劣化。`WebContentsView` で offscreen paint が必要な頻度・形式で取得できるか、入力座標、
  device scale factor、IME、子 popup を含む最小プロトタイプで先に検証する。shared texture を renderer の
  WebGL texture として zero-copy 利用する経路はプラットフォーム固有の native interop を要するため、
  初期実装では採らない。
- 位置づけ: 鑑賞系ページ (動画・デモ) に限った opt-in。ビュー単位で「シェーダ表示に切替」。

### 4.4 判断 (decision-metrics)

| 案 | AI 学習量 | 作業コスト | 目的達成度 | 主目的一致 |
|---|---|---|---|---|
| **Tier 1 のみ先行 (推奨)** | 小 | 小〜中 (注入 + 検証 + 設定/永続化) | 中〜高 (基本的な色調整に到達) | 高 |
| Tier 1 + Tier 2 同時 | 中 (offscreen/入力転送) | 大 | 高 | 中 (常用には過剰) |
| Tier 2 のみ | 中 | 大 | 高 | 低 (通常閲覧が劣化) |

**決定 (2026-08-28): Tier 1 を先行実装する。Tier 2 は技術検証と対象ページ種別の需要確認後に
別フェーズで判断する。Tier 1 の実装仕様は `spec/tasks/2026-08-28-orbis-vitrum-tier1.md` とする。**

## 5. マウスジェスチャ — **設計・実装済み** (P3、+拡張設計)

設計書 §4.5 で設計済み、P3 で実装済み・main 反映済み。現状:

- 外部ページ上で右ボタン押下中の軌跡を preload が収集 (`src/preload/page-bridge.ts`) →
  8 方向量子化 (`src/main/gestus/recognizer.ts`、最小移動 24px・タイムアウト 1.5s) →
  binding 表で Action 解決 → 実行。認識後の contextmenu は抑制済み (誤発火対策)。
- 軌跡と候補アクション名のオーバーレイ表示 (`src/renderer/GestureOverlay/`)。
- 既定: `L`=戻る `R`=進む `UD`=再読込 `DR`=閉じる。設定 UI から再束縛・永続化可 (Settings / binding_store)。

「設計して」に対する回答は上記が既設。その上で、未実装の拡張を以下のとおり設計する (後続フェーズ候補):

1. **ホイールトリガ** — 設計書 §4.5 の「右押し + ホイールは別トリガ」が未実装。
   `GestureSpec` に stroke 文字列に加えて `wheel:up` / `wheel:down` トリガ種を追加し、
   右押下中の wheel イベントを preload で捕捉して 1 発で Action に解決する
   (既定候補: ウインドウ巡回 `fenestra.focusNext/Prev`。これらの Action 自体も新規登録が必要)。
   ストローク認識とは排他にする。
2. **ジェスチャの適用面を広げる** — 現在は外部ページ (page-bridge) のみ。Anulus / Speculum /
   Rota の renderer にも同じ収集 hook を共通化して載せる (`src/renderer/useGestureTrail.ts` に集約)。
3. **録画式の設定 UI** — 現在は文字列 (例 `DR`) の直接編集。設定画面に「描いて登録」欄を追加し、
   実際に描いたストロークを recognizer に通して量子化結果をそのまま binding に保存する。

同一ストロークの競合検査は `BindingStore.save` が既に実施し、設定 UI へ `Binding conflict:` を返すため
追加対象ではない。

上記 3 点は既存 recognizer / Action 抽象を再利用できる。ただしホイールトリガでは binding の表現・検証と
Action 登録、適用面拡大では preload と renderer の入力収集をそれぞれ変更する。

## 6. コントロール UI のリッチ化 — 調査提案

### 6.1 現状

コントロール帯 (`PageControlBar`) と Anulus は素の HTML 要素 + CSS Modules。機能は足りているが
装飾は最小限 (単色グラデ + 角丸 button)。

### 6.2 使えるもの (renderer で Chromium の Web API を利用できる)

| 手段 | 内容 | 備考 |
|---|---|---|
| a. モダン CSS | `backdrop-filter` (すりガラス)、`conic-gradient`、`mask`、`@property` によるプロパティ補間アニメ、View Transitions | 依存ゼロ。frameless + 透過ウインドウ (Anulus) と相性が良い |
| b. WebGL2 / WebGPU シェーダ描画 | 制御帯や Anulus 円環の背景・エフェクトを fragment shader で描く。WebGL2 を基準とし、WebGPU は起動時に capability を検出して未対応時は WebGL2/CSS へ戻す | **Pictor の GLSL 資産を移植候補にできる** (`Pictor/shaders/hologram.frag`、`postprocess/` 等)。Vulkan GLSL と WebGL2 GLSL は resource binding、組み込み変数、座標系等が異なるため、資産ごとの移植・検証が必要 |
| c. Rive (公式 WASM runtime) | ベクタアニメ UI 部品 (ボタン反応・円環の脈動・状態遷移アニメ) を .riv アセットで再生 | **Pictor は `PICTOR_ENABLE_RIVE` で .riv を扱える** (`Pictor/rive/*.riv`)。共有候補だが、runtime 依存・ライセンス・アセット互換性を導入前に確認する |
| d. Pictor 本体の埋め込み | Pictor は C++20 + Vulkan native。Electron renderer には直接埋め込めない | 別プロセスウインドウ (統合感なし) か offscreen 共有 (native module + 共有テクスチャ、コスト大) しかなく **非推奨**。使うなら (b)(c) のとおり「シェーダとアセットを共有」する形が現実的 |

### 6.3 提案 (段階導入) と decision-metrics

| 案 | AI 学習量 | 作業コスト | 目的達成度 | 主目的一致 |
|---|---|---|---|---|
| **Step1: CSS モダン化 (推奨・即行)** — デザイントークン統一 + backdrop-filter + マイクロアニメ | 小 | 小 | 中 | 高 |
| **Step2: シェーダ装飾層 (推奨・次)** — Anulus 円環と制御帯背景を WebGL2 canvas 化、Pictor shader 移植 | 中 | 中 | 高 | 高 (Pictor 資産の再利用) |
| Step3: Rive 部品 — 動きのある UI 部品を .riv で作り Pictor と共用 | 中 | 中 (アセット制作が別途) | 高 | 中 |
| Pictor 直接埋め込み | 大 | 極大 | 高 | 低 (zero-patch 精神に反する重さ) |

**推奨: Step1 → Step2 を Orbis 側フェーズとして実施。Step3 はアセット制作体制 (誰が .riv を作るか) が
決まってから。** Step2 と Vitrum Tier 2 は、shader compile や capability 判定など責務が一致する低層部品だけ
共有候補にできる。ページの offscreen 入出力と UI canvas のライフサイクルは別モジュールに保つ。

---

## まとめ (neco 判断が要るもの)

1. 項目 5: ジェスチャ拡張 3 点の採否 (推奨: ホイールトリガ + 適用面拡大)
2. 項目 6: Step1/Step2 の採否と、Step3 (Rive) のアセット制作体制
3. 項目 2: Concordia 側 sigillum バインドと Orbis 側 `service_detail` 検証の着手時期
