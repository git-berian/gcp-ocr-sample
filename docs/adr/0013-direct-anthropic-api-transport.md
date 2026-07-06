# ADR-0013: Claude 呼び出し経路に Anthropic 直接 API を追加（Vertex とトランスポート切替）

## ステータス

提案

## コンテキスト

ADR-0012 で領収書抽出エンジンとして **Vertex AI 経由の Claude** を採用した（#223 / PR #224 で実装）。しかし GCP プロジェクト `documentaisample-488504` では **Vertex 上の Claude クォータが全 base model で 0（未付与）** であり、Google への自動クォータ増申請は却下された（回答は「新規プロジェクト／請求履歴不足。48h 待って再申請、または請求履歴の蓄積が必要」）。実際に呼び出すと `HTTP 429 RESOURCE_EXHAUSTED` となり、ADR-0012 が本番適用の前提とした**サンプルによる実測比較（精度・コスト・レイテンシー）が完全にブロックされている**。

当該プロジェクトは実利用が少なく請求履歴が積み上がらないため、自動申請は待っても通りにくい。Sales/サポート経由の手動申請（少量・評価用途）は並行して実施するが、承認は不確実で時期も読めない。

ADR-0012 は代替案として **Anthropic 直接 API（`@anthropic-ai/sdk`）** を検討したうえで、「`ANTHROPIC_API_KEY` の Secret Manager 管理が新たに必要」「認証方式・データ処理経路が既存 GCP 構成と別系統になる」ことを理由に却下していた。本 ADR は、Vertex 経路がクォータ与信により使えないという**外部制約の変化**を受けて、この判断を再評価する。

## 決定

Claude の呼び出し経路として **Anthropic 直接 API を追加採用**し、既存の Vertex 経路と**設定で切り替え可能**にする。

- infrastructure 層に **`CLAUDE_TRANSPORT`（`api` | `vertex`）** を追加し、`ReceiptExtractor` ポートの実装（Claude クライアント）を切り替える。**既定は `api`**（当面クォータ非依存で動作する経路を既定とする）。
  - `api`: `new Anthropic({ apiKey })`（`@anthropic-ai/sdk`）
  - `vertex`: 既存 `new AnthropicVertex({ projectId, region })`（ADR-0012）
- **Vertex 経路は削除しない**。クォータ付与後は `CLAUDE_TRANSPORT=vertex` で GCP 統一構成（ADC・データ GCP 内完結）に戻せる。
- 認証は **`ANTHROPIC_API_KEY`（Secret Manager 管理）**。`onRequest` の呼び出し側認証は既存 `API_KEY` を流用する。
- モデル ID（既定 `claude-opus-4-8`）・API 仕様（`temperature`/`top_p`/`top_k` 不送出・`thinking` 省略・構造化出力 `output_config.format`）は両トランスポートで共通。
- リクエスト/レスポンス形状は `@anthropic-ai/sdk` と `@anthropic-ai/vertex-sdk` でほぼ同一（同じ `messages.create`）のため、**共有ロジック**（プロンプト・JSON Schema・コンテンツブロック生成・レスポンス解析＋`stop_reason` 処理＋正準モデルへの正規化）を抽出し、2アダプタは**クライアント生成の差分のみ**とする。
- **エンドポイントは増やさない**。既存 `parseDocumentClaudeCall` / `parseDocumentClaudeHttp`（ADR-0012）をそのまま用い、トランスポートは設定で選ぶ。

ADR-0012 は廃止しない。本 ADR は ADR-0012 の「直接 API を却下」という**部分判断のみを上書き**し、Vertex 経路の意思決定はそのまま有効とする。本 ADR は方針の意思決定を扱い、コード実装は別 PR で行う。

## 理由

- **評価をクォータ非依存で前進できる**: 直接 API は Anthropic 側のアカウントレート上限のみに依存し、GCP クォータ与信を回避できる。ADR-0012 が前提とした PR-B 実測（精度・コスト・レイテンシー）を実際に採取できるようになる。
- **追加コストが小さい**: 両 SDK は同一の Messages API 形状を持つため、共有ロジックを再利用でき、直接 API アダプタはクライアント生成の差分のみで済む。
- **Vertex の利点を捨てない**: トランスポート切替にすることで、クォータ付与後に設定変更だけで GCP 統一構成（ADC・データレジデンシーが GCP 方針に載る）へ戻せる。ADR-0012 の実装（PR #224）は無駄にならない。

代替案として次を検討した。

- **Vertex クォータの承認を待つ**: 承認が不確実かつ時期未定で、評価が無期限に停滞する。当該プロジェクトは請求履歴が積まれにくく自動申請が通りにくい。却下（Sales 申請は並行するが、本 ADR の前提には置かない）。
- **Claude 採用自体を見送り、Gemini / Document AI のみで継続**: エンジン多様化・比較の価値（ADR-0012 の動機）を失う。却下。

## 影響

- **コスト**: 単価は Vertex と同水準（既定 `claude-opus-4-8` 入力 $5.00 / 出力 $25.00・100万トークンあたり）。従量課金は **Anthropic 側の請求**となり、GCP 請求とは別系統。1 枚あたり概算は ADR-0012 のコスト表を流用し、実測は本 ADR の検証で採取する。
- **クォータ・レート制限**: Anthropic API の**アカウント単位のレート上限（RPM / ITPM / OTPM、利用 Tier に依存）**に従う。GCP クォータ非依存。件数増加時は Tier 引き上げ・バックオフ方針を評価する。
- **レイテンシー**: `claude-opus-4-8` は高精度な一方、応答時間は Gemini Flash より長くなり得る（ADR-0012 と同様）。`CLAUDE_TIMEOUT_MS`（既定 30 秒）と Cloud Functions タイムアウト（gen2 既定 60 秒）の妥当性を検証で確認する。SDK の再試行（既定 maxRetries=2 でタイムアウトも再試行）は Vertex 実装同様に無効化し、関数の外側デッドライン超過とコスト増を避ける。
- **データレジデンシー・個人情報（最重要トレードオフ）**: 領収書には店名・日付・金額・登録番号など個人情報・取引情報が含まれる。直接 API では、これらが **GCP / Vertex を経由せず Anthropic の API（主に米国リージョン）へ送信**される。Anthropic API は既定で**入力データをモデル学習に使用せず**、一定期間で削除する運用だが、**GCP 内に処理が閉じる Vertex 経路とは処理主体・データ処理条件（DPA）が異なる**。本 ADR では **評価 / POC 目的に限り許容**とする。**本番採用の前に、Anthropic のデータ処理条件・DPA の確認、個人情報保護法・契約上の要件充足、必要に応じ ZDR（ゼロデータ保持）等のオプション要否を検討する**ことを必須とする。データ所在要件が厳しい場合は `CLAUDE_TRANSPORT=vertex`（クォータ付与後）を選ぶ。
- **コンプライアンス・セキュリティ**: 新シークレット `ANTHROPIC_API_KEY` を **Secret Manager** で管理する（コードにハードコードしない。ローカルは `.env.local`、デプロイ環境は Functions ランタイムのサービスアカウントに Secret アクセス権を付与）。キー漏洩時のローテーション手順を運用に含める。`onRequest` の呼び出し側認証は既存 `API_KEY` を流用する。Vertex 経路と異なり `roles/aiplatform.user` は不要。
- **受容リスク（本 ADR のスコープであえて対応しないと決めた事項）**:
  - Anthropic のデータ処理条件の詳細確認・DPA 締結は本 ADR では行わない（本番採用前に実施）。
  - トランスポート差による挙動差（エラー形状・レート制限メッセージ・再試行既定）は実装・検証で吸収する。
  - 合計・税額・明細の整合検証は引き続きスコープ外（ADR-0011 と同様、application 層での整合検証は将来の余地として残す）。
- **検証（実装 PR / 本番採用前）**: クォータ非依存で実測できるため、実装 PR で `CLAUDE_TRANSPORT=api` にて代表サンプル数枚を実測し、以下を本 ADR に記録する（ADR-0012 の PR-B 相当を達成）。
  - **トークン・コスト**: レスポンスの `usage.input_tokens` / `usage.output_tokens` から 1 枚あたりの実トークンと概算コストを算出。
  - **レイテンシー**: 実応答時間を計測し、`CLAUDE_TIMEOUT_MS` と関数タイムアウトの妥当性を確認。
  - **抽出精度**: 手書き含むサンプルで Document AI / Gemini / Claude を比較。
