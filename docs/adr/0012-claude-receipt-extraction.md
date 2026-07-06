# ADR-0012: 領収書抽出エンジンに Vertex AI 経由の Claude を並列採用

## ステータス

提案

## コンテキスト

現行の Functions は Document AI（Expense Parser、ADR-0002）と Vertex AI Gemini（ADR-0010）で領収書を解析している。Gemini の並列採用により手書き領収書の精度は改善したが、抽出エンジンは単一のマルチモーダルモデルに依存している。

領収書は店舗・レイアウト・手書き比率のばらつきが大きく、特定モデルが不得手とする入力（崩れた手書き、複雑なレイアウト、低コントラストなレシート）が一定数存在しうる。抽出エンジンの選択肢を広げ、モデル特性に応じて使い分け・比較できる余地を持たせることには運用上の価値がある。

Claude（Anthropic）は高いマルチモーダル理解を持ち、かつ **Google Cloud Vertex AI 経由で利用できる**。Vertex 経由であれば、既存の Document AI / Gemini と同じ ADC 認証・GCP プロジェクト・データレジデンシー方針にそのまま載り、新しいシークレット管理を増やさずに並列採用できる。

なお本 ADR は方針の意思決定を扱う。Gemini（ADR-0010）で行ったような手書きサンプルでの精度実測比較は本 ADR のスコープでは未実施であり、**本番適用の前にサンプルを用いた Gemini / Claude / Document AI の比較検証を行う**ことを前提とする。

## 決定

領収書抽出エンジンとして、**Vertex AI 経由の Claude を外部抽出サービスとして並列採用する**。

- 既存の Document AI 経路（`parseDocumentCall` / `parseDocumentHttp`）および Gemini 経路（`parseDocumentGeminiCall` / `parseDocumentGeminiHttp`）は**変更せず残す**。
- Claude 用に**別エンドポイントを新設**する（`parseDocumentClaudeCall` / `parseDocumentClaudeHttp`）。同一エンドポイントでのエンジン分岐は行わず、入り口を分離する（ADR-0010 と同方針）。
- Claude 呼び出しは公式 SDK **`@anthropic-ai/vertex-sdk`（`AnthropicVertex`）** を使用する。認証は **ADC（サービスアカウント）** で行い、**新しいシークレットは追加しない**。`onRequest` の呼び出し側認証は既存の `API_KEY` を流用する。
- レスポンスは正準モデル **`ReceiptExtraction`（ADR-0011）** に統一し、`meta.source` に **`"claude"`** を追加する。infrastructure 層のアダプタが Anti-Corruption Layer として Claude 出力を正準モデルへマッピングし、既存の正規化ヘルパー（`receipt-normalize.ts`）を共有する。
- 抽出結果は Claude の**構造化出力（`output_config.format` の JSON Schema）** で JSON を強制し、Gemini の `responseSchema` と等価なスキーマを用いる。
- デフォルトのモデルは **`claude-opus-4-8`**、ロケーションは `global` とし、環境変数（`CLAUDE_MODEL` / `CLAUDE_LOCATION` / `CLAUDE_TIMEOUT_MS`）で切替可能にする。

本 ADR は方針の意思決定のみを扱い、コード実装は別 PR で行う。

## 理由

- **認証・構成の統一**: Vertex 経由の Claude は既存 GCP（Document AI / Gemini）と同じ ADC 認証・プロジェクト・リージョン設定に載る。Anthropic 直接 API と異なり **API キー用の新しいシークレット（Secret Manager）を追加せずに済み**、データレジデンシー方針も既存と一貫させられる。
- **エンジンの多様化**: 単一モデル依存を避け、入力特性に応じてエンジンを選択・比較できる。抽出品質のリスク分散になる。
- **入り口の分離**: エンジンごとに SDK・出力形状が異なるため、同一エンドポイントで複雑な分岐を組むより入り口（関数）を分けるほうがシンプルで影響範囲が閉じる（ADR-0010 と同じ判断）。
- **既存への非影響 / クリーンアーキテクチャとの整合（ADR-0001）**: Document AI・Gemini 経路を残しつつ、外部サービスは infrastructure 層に閉じる。`DocumentProcessor` / Gemini クライアントと同様に、Claude クライアントも外部サービスゲートウェイ（ADR-0009）として位置づける。

代替案として次を検討した。

- **Anthropic 直接 API（`@anthropic-ai/sdk`）**: 最新モデル・機能へのアクセスが最も速い。しかし `ANTHROPIC_API_KEY` の Secret Manager 管理が新たに必要になり、認証方式・データ処理経路が既存 GCP 構成と別系統になる。本プロジェクトは GCP 統一構成・ADC 認証を重視するため、Vertex 経由を優先し却下した（将来 Vertex 未提供の機能が必要になった場合に再検討する余地は残す）。
- **Gemini / Document AI のみで運用継続**: エンジンを増やさない選択。ただしモデル特性の使い分け・比較の余地がなくなるため、選択肢を持つ本 ADR を採用した。

## 影響

- **依存追加**: `packages/functions` に `@anthropic-ai/vertex-sdk` を追加する。
- **コスト**: 既定モデル `claude-opus-4-8` は **入力 $5.00 / 出力 $25.00（100万トークンあたり、2026-06 時点の一覧価格）** で、Gemini 2.5 Flash（入力 $0.30 / 出力 $2.50）より**大幅に高単価**。1 枚あたりの実コストは画像トークン数・出力長に依存し、**本 ADR 時点では未実測**。本番採用の前に代表サンプルでトークン実測とコスト試算を行うこと。コスト最適化として、送信前の画像縮小、および用途に応じた下位モデル（`claude-sonnet-5` 等）の選択余地を `CLAUDE_MODEL` で残す。多ページ PDF は 10 ページまで $0.10 固定の Document AI が有利な場合がある。
- **クォータ・レート制限**: Vertex AI の Claude はプロジェクト単位の TPM/RPM クォータ（Model Garden のモデル有効化に紐づく）を持ち、既存 Vertex ワークロードと枠を共有しうる。件数増加時の枯渇リスクとレート超過時のリトライ/バックオフ方針を評価する。
- **レイテンシー**: `claude-opus-4-8` は高精度な一方、応答時間は Gemini Flash より長くなり得る（thinking は無効運用だが上位モデルのため）。Cloud Functions のタイムアウト（gen2 デフォルト 60 秒）と `CLAUDE_TIMEOUT_MS`（既定 30 秒）の見直しが必要になる場合がある。
- **データレジデンシー・個人情報**: 既定の `global` エンドポイントは可用性優先で**処理リージョン（データ所在）が保証されない**。領収書には店名・日付・金額など個人情報・取引情報が含まれるため、国内処理が要件（個人情報保護法・契約上）の場合は `CLAUDE_LOCATION` を `asia-northeast1` 等のリージョンに切り替える（当該リージョンで Claude モデルが提供されていることの確認が前提）。
- **コンプライアンス・セキュリティ**: 認証は ADC。IAM は既存の `roles/aiplatform.user`（`aiplatform.endpoints.predict` 等）を流用でき、**Vertex 経由のため追加ロールは不要**。ローカルは `secrets/sa.json`、デプロイ環境は Functions ランタイムのサービスアカウントに付与する（付与漏れは `messages.create` の 403 → ハンドラ 500 となり原因が分かりにくい点に注意）。前提として GCP プロジェクトで**課金の有効化**・**Vertex AI API の有効化**、および **Model Garden での Claude `claude-opus-4-8` の有効化（利用規約への同意を含む）** が必要。
- **リージョン/モデルの可用性（新規制約）**: Gemini と異なり、Vertex 上の Claude は**リージョンおよびモデルの提供状況に依存**する。`CLAUDE_LOCATION` で選ぶリージョン（または `global` エンドポイント）で `claude-opus-4-8` が利用可能であることをデプロイ前に確認する。未提供リージョンでは 404/400 となる。
- **プロンプト管理**: 抽出品質はプロンプトに依存する。プロンプトは Gemini と同様に**バージョン管理下のコード内定数**として保持し、変更は PR/デプロイ単位で反映する。
- **API 仕様上の注意（受容リスク）**: `claude-opus-4-8` では `temperature` 等のサンプリングパラメータが指定不可（400）で、`thinking` は省略で無効になる。Gemini 実装（`temperature:0` / `thinkingBudget:0`）からのコピー時にこれらを持ち込まないこと。数値表記揺れ（税込/税別・全角・カンマ）は infrastructure 層の正規化で吸収するが、**合計・税額・明細の整合検証は本 ADR のスコープでは行わない**（ADR-0011 と同様、application 層での整合検証は将来の余地として残す）。
- **出力の互換性 / Web 連携**: Claude エンドポイントは他エンジンと同一の `ReceiptExtraction`（`{ receipt }`）を返すため、レスポンス契約上の非互換はない。ただし Web からのエンジン切替 UI・配線は Gemini 同様に未実装であり、**別 Issue で対応**する（本 ADR/実装のスコープ外）。型契約として `ReceiptMeta.source` への `"claude"` 追加のみ functions/web 双方に反映する。
