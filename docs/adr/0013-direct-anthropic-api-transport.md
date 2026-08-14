# ADR-0013: Claude 呼び出し経路に Anthropic 直接 API を追加（Vertex とトランスポート切替）

## ステータス

提案

## コンテキスト

ADR-0012 で領収書抽出エンジンとして **Vertex AI 経由の Claude** を採用した（#223 / PR #224 で実装）。しかし GCP プロジェクト `documentaisample-488504` では **Vertex 上の Claude クォータが全 base model で 0（未付与）** であり、Google への自動クォータ増申請は却下された（回答は「新規プロジェクト／請求履歴不足。48h 待って再申請、または請求履歴の蓄積が必要」）。実際に呼び出すと `HTTP 429 RESOURCE_EXHAUSTED` となり、ADR-0012 が本番適用の前提とした**サンプルによる実測比較（精度・コスト・レイテンシー）が完全にブロックされている**。（※本段落は本 ADR 執筆時点＝2026-07-06 の状況。この前提は後日変化しており、現況は後述の「Vertex 経路の再評価」を参照）

当該プロジェクトは実利用が少なく請求履歴が積み上がらないため、自動申請は待っても通りにくい。Sales/サポート経由の手動申請（少量・評価用途）は並行して実施するが、承認は不確実で時期も読めない。

ADR-0012 は代替案として **Anthropic 直接 API（`@anthropic-ai/sdk`）** を検討したうえで、「`ANTHROPIC_API_KEY` の Secret Manager 管理が新たに必要」「認証方式・データ処理経路が既存 GCP 構成と別系統になる」ことを理由に却下していた。本 ADR は、Vertex 経路がクォータ与信により使えないという**外部制約の変化**を受けて、この判断を再評価する。

## 決定

Claude の呼び出し経路として **Anthropic 直接 API を追加採用**し、既存の Vertex 経路と**設定で切り替え可能**にする。

- infrastructure 層に **`CLAUDE_TRANSPORT`（`api` | `vertex`）** を追加し、`ReceiptExtractor` ポートの実装（Claude クライアント）を切り替える。**既定は `api`**（当面クォータ非依存で動作する経路を既定とする）。
  - `api`: `new Anthropic({ apiKey })`（`@anthropic-ai/sdk`）
  - `vertex`: 既存 `new AnthropicVertex({ projectId, region })`（ADR-0012）
- **Vertex 経路は削除しない**。クォータ付与後は `CLAUDE_TRANSPORT=vertex` で GCP 統一構成（ADC・データ GCP 内完結）に戻せる。（※後述の「Vertex 経路の再評価」の通り、復帰にはクォータに加えて**組織ポリシーによる構造化出力の許可、またはコード側での代替実装**が必要であることが後日判明した）
- 認証は **`ANTHROPIC_API_KEY`（Secret Manager 管理）**。`onRequest` の呼び出し側認証は既存 `API_KEY` を流用する。
- モデル ID（既定 `claude-opus-4-8`）・API 仕様（`temperature`/`top_p`/`top_k` 不送出・`thinking` 省略・構造化出力 `output_config.format`）は両トランスポートで共通。（※構造化出力は vertex 経路では**組織ポリシーによる明示的な許可が前提**。後述の「Vertex 経路の再評価」を参照）
- リクエスト/レスポンス形状は `@anthropic-ai/sdk` と `@anthropic-ai/vertex-sdk` でほぼ同一（同じ `messages.create`）のため、**共有ロジック**（プロンプト・JSON Schema・コンテンツブロック生成・レスポンス解析＋`stop_reason` 処理＋正準モデルへの正規化）を抽出し、2アダプタは**クライアント生成の差分のみ**とする。
- **エンドポイントは増やさない**。既存 `parseDocumentClaudeCall` / `parseDocumentClaudeHttp`（ADR-0012）をそのまま用い、トランスポートは設定で選ぶ。

ADR-0012 は廃止しない。本 ADR は ADR-0012 の「直接 API を却下」という**部分判断のみを上書き**し、Vertex 経路の意思決定はそのまま有効とする。本 ADR は方針の意思決定を扱い、コード実装は別 PR で行う。

## 理由

- **評価をクォータ非依存で前進できる**: 直接 API は Anthropic 側のアカウントレート上限のみに依存し、GCP クォータ与信を回避できる。ADR-0012 が前提とした PR-B 実測（精度・コスト・レイテンシー）を実際に採取できるようになる。
- **追加コストが小さい**: 両 SDK は同一の Messages API 形状を持つため、共有ロジックを再利用でき、直接 API アダプタはクライアント生成の差分のみで済む。
- **Vertex の利点を捨てない**: トランスポート切替にすることで、クォータ付与後に設定変更だけで GCP 統一構成（ADC・データレジデンシーが GCP 方針に載る）へ戻せる。ADR-0012 の実装（PR #224）は無駄にならない。（※後述の「Vertex 経路の再評価」の通り、実際の復帰条件はクォータ付与だけでは足りず、**組織ポリシーの許可値追加、またはコード側での構造化出力の代替**が必要と後日判明した。Vertex 実装自体が無駄にならない点は変わらない）

代替案として次を検討した。

- **Vertex クォータの承認を待つ**: 承認が不確実かつ時期未定で、評価が無期限に停滞する。当該プロジェクトは請求履歴が積まれにくく自動申請が通りにくい。却下（Sales 申請は並行するが、本 ADR の前提には置かない）。
- **Claude 採用自体を見送り、Gemini / Document AI のみで継続**: エンジン多様化・比較の価値（ADR-0012 の動機）を失う。却下。

## 影響

- **コスト**: 単価は Vertex と同水準（既定 `claude-opus-4-8` 入力 $5.00 / 出力 $25.00・100万トークンあたり）。従量課金は **Anthropic 側の請求**となり、GCP 請求とは別系統。1 枚あたり概算は ADR-0012 のコスト表を流用し、実測は本 ADR の検証で採取する。
- **クォータ・レート制限**: Anthropic API の**アカウント単位のレート上限（RPM / ITPM / OTPM、利用 Tier に依存）**に従う。GCP クォータ非依存。件数増加時は Tier 引き上げ・バックオフ方針を評価する。
- **レイテンシー**: `claude-opus-4-8` は高精度な一方、応答時間は Gemini Flash より長くなり得る（ADR-0012 と同様）。`CLAUDE_TIMEOUT_MS`（既定 30 秒）と Cloud Functions タイムアウト（gen2 既定 60 秒）の妥当性を検証で確認する。SDK の再試行（既定 maxRetries=2 でタイムアウトも再試行）は Vertex 実装同様に無効化し、関数の外側デッドライン超過とコスト増を避ける。
- **データレジデンシー・個人情報（最重要トレードオフ）**: 領収書には店名・日付・金額・登録番号など個人情報・取引情報が含まれる。直接 API では、これらが **GCP / Vertex を経由せず Anthropic の API（主に米国リージョン）へ送信**される。Anthropic API は既定で**入力データをモデル学習に使用せず**、一定期間で削除する運用だが、**GCP 内に処理が閉じる Vertex 経路とは処理主体・データ処理条件（DPA）が異なる**。本 ADR では **評価 / POC 目的に限り許容**とする。**本番採用の前に、Anthropic のデータ処理条件・DPA の確認、個人情報保護法・契約上の要件充足、必要に応じ ZDR（ゼロデータ保持）等のオプション要否を検討する**ことを必須とする。データ所在要件が厳しい場合は `CLAUDE_TRANSPORT=vertex` を選ぶ。ただし後述の「Vertex 経路の再評価」の通り、この用途では **3 条件**が必要になる（2026-08-14 時点で (2)(3) が未充足。付与済みの `global` のクォータは、処理リージョンを保証しないためこの用途には使えない）。(1) `global` は処理リージョンを保証しないため `CLAUDE_LOCATION` にマルチリージョン／リージョン指定が必要（ADR-0012）、(2) **そのリージョンでのクォータ付与**（実測では `us-east5` は 429。クォータはリージョンごとに別枠）、(3) 組織ポリシーによる構造化出力の許可、またはコード側での代替実装。
- **コンプライアンス・セキュリティ**: 新シークレット `ANTHROPIC_API_KEY` を **Secret Manager** で管理する（コードにハードコードしない。ローカルは `.env.local`、デプロイ環境は Functions ランタイムのサービスアカウントに Secret アクセス権を付与）。キー漏洩時のローテーション手順を運用に含める。`onRequest` の呼び出し側認証は既存 `API_KEY` を流用する。Vertex 経路と異なり `roles/aiplatform.user` は不要。
- **受容リスク（本 ADR のスコープであえて対応しないと決めた事項）**:
  - Anthropic のデータ処理条件の詳細確認・DPA 締結は本 ADR では行わない（本番採用前に実施）。
  - トランスポート差による挙動差（エラー形状・レート制限メッセージ・再試行既定）は実装・検証で吸収する。
  - 合計・税額・明細の整合検証は引き続きスコープ外（ADR-0011 と同様、application 層での整合検証は将来の余地として残す）。
- **検証（実装 PR / 本番採用前）**: クォータ非依存で実測できるため、実装 PR で `CLAUDE_TRANSPORT=api` にて代表サンプルを実測し、以下を記録する（ADR-0012 の PR-B 相当を達成）。

### 検証結果（実測・2026-07-06 / `CLAUDE_TRANSPORT=api` / `claude-opus-4-8`）

代表サンプル3枚を Anthropic 直接 API で実測（`input/` の領収書、単ページ画像）。

| サンプル       | レイテンシー | 入力トークン | 出力トークン | 概算コスト/枚 | 抽出                                  |
| -------------- | ------------ | ------------ | ------------ | ------------- | ------------------------------------- |
| 飲食店領収書   | 11.2 s       | 5,461        | 244          | $0.033        | 店名/日付/合計/税/登録番号 全項目取得 |
| カラオケ領収書 | 8.5 s        | 5,461        | 277          | $0.034        | 全項目取得                            |
| 交通費（切符） | 8.0 s        | 5,461        | 172          | $0.032        | 税額・登録番号を正しく null           |

- **`output_config.format`（構造化出力）が直接 API の `messages.create` で問題なく通ることを確認**（`stop_reason: end_turn`、beta ヘッダ不要）。サンプリングパラメータ不送出・`thinking` 省略でも 400 は発生しない。
- **トークン・コスト**: 入力は画像正規化により元解像度に依らず概ね一定（約 5,461 トークン。画像＋プロンプト支配）。出力は transcription 長で変動。**1 枚あたり約 $0.032〜0.034**（opus-4-8）。ADR-0012 のコスト概算表（opus $0.015〜0.04/枚）の範囲内。
- **レイテンシー**: 8〜11 秒。`CLAUDE_TIMEOUT_MS`（30 秒）・Cloud Functions（gen2 既定 60 秒）ともに余裕あり。
- **抽出精度**: 3枚とも主要項目を正確に抽出。インボイス登録番号（T+13桁）・税額・日付を含め妥当。登録番号や税額が無い交通費領収書では正しく `null` を返した。

**手書きサンプル（追加実測・4枚）**: 手書きの領収書4枚でも `output_config.format` は問題なく通り（全て `stop_reason: end_turn`）、レイテンシー **6.4〜8.4 秒**・**約 $0.032〜0.034/枚**と印刷サンプルと同水準。**店名・手書きの日付・合計金額を正確に抽出**し、実用水準の読み取り精度を確認した。税額を別記しない領収書では税額を正しく `null`、"T+13桁" 形式でない登録番号（例: 8桁のみ）は正規化契約（`^T\d{13}$`）により正しく `null` とした。手書きを含む Document AI / Gemini との定量比較は本番採用判断時に拡充する。（※サンプルは個人情報を含むため本 ADR には具体内容を記録せず集計のみ）

### Vertex 経路の再評価（実測・2026-08-14 / `claude-opus-4-8`）

本 ADR 執筆時点の前提（Vertex 上の Claude クォータが全 base model で 0）が変化したため、`CLAUDE_TRANSPORT=vertex` の疎通を再確認した。結論として **クォータは付与されていたが、別要因により vertex 経路は現状のコードでは利用できない**。

#### 1. クォータ・モデルアクセス

最小トークンのテキストリクエスト（`max_tokens: 16`）で確認した。

| リージョン | `claude-opus-4-8`         | `claude-opus-5` / `claude-sonnet-5` / `claude-haiku-4-5` |
| ---------- | ------------------------- | -------------------------------------------------------- |
| `global`   | **200 OK**（1.8 秒）      | 404（Publisher model 未有効化）                          |
| `us-east5` | 429（RESOURCE_EXHAUSTED） | 404（同上）                                              |

- `global` の `claude-opus-4-8` は**クォータ付与済み**。本 ADR の前提だった「全 base model で 0」は、**この組み合わせに限って解消**された。他モデルは 404（Model Garden 未有効化）であり、**404 はクォータの有無を示さない**ため、有効化後に 429 となる可能性は残る。
- `us-east5` は `online_prediction_input_tokens_per_minute_per_base_model`（base model `anthropic-claude-opus-4-8`）で 429。**クォータはリージョンごとに別枠**であり、global と us-east5 は独立している。
- 既定モデル以外は Model Garden 側で未有効化のため 404。モデルを変更する場合は先に有効化が必要。

#### 2. 新たなブロッカー: 組織ポリシーによる構造化出力の拒否

実装（`createClaudeReceiptExtractor`）をそのまま `CLAUDE_TRANSPORT=vertex` で実行すると、画像リクエストが **400 FAILED_PRECONDITION** で失敗する。

```text
Organization Policy constraint constraints/vertexai.allowedPartnerModelFeatures violated
... attempting to use a disallowed feature structured_outputs for Partner model claude-opus-4-8
```

- 原因は本 ADR で両トランスポート共通としていた**構造化出力 `output_config.format`**。
- Vertex では `structured_outputs` は**組織配下のプロジェクトでは既定で拒否**され、組織ポリシー `constraints/vertexai.allowedPartnerModelFeatures` の許可値に `publishers/anthropic/models/claude-opus-4-8:structured_outputs` を追加する必要がある（モデルごとに 1 エントリ）。設定には `roles/orgpolicy.policyAdmin` が必要。
- Anthropic 直接 API にはこの制約が無く、本 ADR の api 経路実測（前節）で問題なく通っていた。**同じ Messages API でもトランスポートによって利用可否が異なる**点が、本 ADR で想定していなかった差分である。

#### 3. 代替方式の実測

構造化出力を使わずに形式を確保できるかを検証した。

| 方式                                           | 結果       | レイテンシー | 入力 / 出力トークン |
| ---------------------------------------------- | ---------- | ------------ | ------------------- |
| `output_config.format`（現行実装）             | **400**    | —            | —                   |
| tool use + `tool_choice` 強制（`strict` なし） | **200 OK** | 8.3 秒       | 5,683 / 356         |
| tool use + `strict: true`                      | **400**    | —            | —                   |
| プロンプトで JSON 指示（構造化出力なし）       | 200 OK     | 7.1 秒       | 4,951 / 258         |

- **`strict: true` も同じ `structured_outputs` フィーチャー扱いで拒否される**。一方、素の tool use は許可される。
- **強制 tool use が最有力の代替**。`tool_use.input` がパース済みの JSON オブジェクトとして返るため、フェンス剥がしや `JSON.parse` 失敗が発生しない。実測でもスキーマの 6 キーが全て揃い、余計なキーは無かった。
- プロンプトによる JSON 指示は ` ```json ` フェンス付きで返るため、剥がし処理とパース失敗時のリトライを自前で持つ必要があり、tool use より脆い。
- `strict` によるスキーマ強制を失っても、`normalizeReceiptExtraction`（`packages/functions/src/application/receipt-normalize.ts`）が**キー欠損・型違いを境界で吸収**するため後段は壊れない。構造化出力は「あれば楽」だが、正準モデルへの正規化契約は既に独立して担保されている。
- 200 で通った 2 方式はいずれも主要項目（店名・日付・合計金額・税額）を抽出し、記載の無い登録番号は `null` を返した。ただし**同一サンプルでの api 経路との値の突き合わせは未実施**であり、精度の同等性までは確認していない（※サンプルは個人情報を含むため具体内容は記録しない）。

#### 4. 判断

**Vertex 経路への切り替えは見送り、`CLAUDE_TRANSPORT=api` を既定のまま継続する。** 組織ポリシーの変更権限が無く、コード側での代替実装（強制 tool use への分岐）は本 ADR のスコープ外のため、本節は判断材料の記録に留める。

vertex 経路を有効化する場合、以下のいずれかが必要になる。

1. **組織ポリシーの許可値追加**（推奨・コード変更不要）: 管理者が `constraints/vertexai.allowedPartnerModelFeatures` に `publishers/anthropic/models/claude-opus-4-8:structured_outputs` を追加する。両トランスポートの実装差分をクライアント生成のみに保てる。
2. **コード側での代替実装**: vertex 時のみ強制 tool use に分岐する。組織ポリシーに依存しないが、本 ADR の「共有ロジック＋クライアント生成の差分のみ」という設計方針を崩す範囲が**リクエスト組み立てに留まらない**点に注意する。強制 tool use では JSON が `tool_use` ブロックの `input` に入り text ブロックが返らないため、text ブロックを探して `JSON.parse` する現行のレスポンス解析（`packages/functions/src/infrastructure/claude-client.ts` の `messages.create` 後段）も分岐が必要になる。すなわちリクエスト・レスポンス双方の分岐となり、共有できるのはプロンプトとスキーマ定義、および `normalizeReceiptExtraction` への受け渡しに留まる。

いずれも別 Issue / 別 ADR で扱う。
