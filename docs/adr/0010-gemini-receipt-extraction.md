# ADR-0010: 手書き領収書向けに Vertex AI Gemini を並列採用

## ステータス

提案

## コンテキスト

現行の Functions は Document AI（Expense Parser、ADR-0002）で領収書を解析している。しかし**手書き領収書の解析精度が実用に耐えない**という問題が発生した。

原因を切り分けた結果、崩れているのは OCR（文字認識）層そのものであり、Document AI が手書き文字を読み取れていない（例: 手書きの店名が別の文字列に化ける、金額が欠落する）。これは GCP コンソールの Document AI テストツールでも同様に再現し、Expense Parser が印刷レシート向けに学習された固定モデルであることに起因する。`processOptions`（`languageHints` 等）の調整では改善の上限が低い。

`input/` の手書き領収書3枚を用いて、現行 Document AI と Vertex AI Gemini（`gemini-2.5-flash`、画像を直接渡して構造化 JSON を抽出）を**限定的に実測比較**した結果は以下の通り（サンプル3枚のパイロット比較であり統計的有意性はない。本番適用前にサンプルを拡大した検証が必要）。

| 項目            | 現行 Document AI      | Gemini 2.5 Flash |
| --------------- | --------------------- | ---------------- |
| 店名（3枚）     | 0/3（全て空）         | 3/3 正解         |
| 合計金額（3枚） | 1/3（2枚は誤り/欠落） | 3/3 正解         |
| 日付（3枚）     | 1/3                   | 3/3 正解         |

手書き比率が高いほど差が開き、Gemini のマルチモーダル理解（文脈から崩れた文字を補完する）が有効であることが裏付けられた。

## 決定

手書き対応のため、**Vertex AI Gemini を外部抽出サービスとして並列採用する**。

- 既存の Document AI 経路（`parseDocumentCall` / `parseDocumentHttp`）は**変更せず残す**。
- Gemini 用に**別エンドポイントを新設**する（`parseDocumentGeminiCall` / `parseDocumentGeminiHttp`）。同一エンドポイントでのエンジン分岐は行わず、入り口を分離する。
- Gemini 呼び出しは公式 SDK **`@google/genai`** を Vertex AI モードで使用する。認証は ADC（サービスアカウント）で行い、新しいシークレットは追加しない。`onRequest` の呼び出し側認証は既存の `API_KEY` を流用する。
- Gemini の出力は Document AI 互換の `ExtractedField[]` にはせず、**専用の構造化型 `ReceiptExtraction`**（店名 / 日付 / 合計 / 税額 / 明細 / 書き起こし）を新設する。
- デフォルトのロケーションは `global`、モデルは `gemini-2.5-flash` とし、環境変数（`GEMINI_LOCATION` / `GEMINI_MODEL`）で切替可能にする。

本 ADR は方針の意思決定のみを扱い、コード実装は別 PR で行う。

## 理由

- **設定調整では解決しない**: 精度劣化は OCR モデルの能力限界であり、Document AI 側のパラメータでは改善できないことを実測とダッシュボードで確認した。
- **実データで有効性を確認済み**: 上記比較の通り、Gemini は手書きで大幅に高精度。
- **入り口の分離**: エンジンごとに認証方式・出力形状が異なるため、同一エンドポイントで複雑な分岐を組むより、入り口（関数）を分けるほうがシンプルで影響範囲が閉じる。
- **既存への非影響**: Document AI 経路を残すことで、印刷主体の帳票では既存挙動を維持しつつ、手書きは Gemini を選べる。
- **クリーンアーキテクチャとの整合（ADR-0001）**: 外部サービスは infrastructure 層に閉じるため、application/domain への影響なく実装差分を局所化できる。`DocumentProcessor` と同様に、Gemini クライアントも外部サービスゲートウェイ（ADR-0009）として位置づける。

代替案として次を検討した。

- **Document AI Custom Extractor（生成AI版）への切替**: GCP 内で完結できるが、新プロセッサの作成・スキーマ定義が必要でコストが高い。手書きの読み取り精度は Gemini マルチモーダルが優位と判断。（Google Cloud 公式では "Custom Extractor with generative AI" / "foundation model" と呼称）
- **既存 Expense Parser のパラメータ調整**: 上記理由により上限が低く却下。

## 影響

- **依存追加**: `packages/functions` に `@google/genai` を追加する。
- **IAM 要件**: Gemini 呼び出しには `roles/aiplatform.user`（Vertex AI / Agent Platform ユーザー、権限 `aiplatform.endpoints.predict` 等）が必要。
  - ローカル開発: `secrets/sa.json` のサービスアカウントに付与する。
  - デプロイ環境: Cloud Functions ランタイムのサービスアカウントに付与する（付与漏れは `generateContent` の 403 となり、ハンドラは 500 を返すため原因が分かりにくい点に注意）。
  - 前提として GCP プロジェクトで **課金の有効化**と **Vertex AI API（`aiplatform.googleapis.com`）の有効化**が必要。
  - 最小権限を徹底する場合は、`roles/aiplatform.user` は広範なため、`aiplatform.endpoints.predict` 等に絞ったカスタムロールを付与する選択肢もある（運用コストとのトレードオフ）。
- **コスト**: Gemini マルチモーダル（画像入力）は入力・出力トークン量に応じた従量課金で、画像はトークン換算されるため、ページ単価の Document AI と比べ**1リクエストあたり高価になりやすい**。想定処理件数での予算影響を見積もり、モニタリングする（具体単価はモデル・リージョンの最新料金を都度確認）。
- **クォータ・レート制限**: Vertex AI Gemini はプロジェクト単位の TPM/RPM クォータを持ち、既存ワークロードと共有する。件数増加時の枯渇リスクとレート超過時のリトライ/バックオフ方針を評価する。
- **レイテンシー**: 応答時間は画像解像度・トークン数に依存し、Document AI より長くなり得る。Cloud Functions のタイムアウト（gen2 デフォルト 60 秒）の見直しが必要になる場合がある。
- **プロンプト管理**: 抽出品質はプロンプトに大きく依存する。プロンプトは**バージョン管理下のコード内定数**として保持し、変更は PR/デプロイ単位で反映する。将来、`GEMINI_PROMPT_VERSION` 等による切替戦略の導入余地を残す。
- **データレジデンシー・個人情報**: デフォルトの `global` エンドポイントは可用性優先で**処理リージョン（データ所在）が保証されない**。領収書には店名・日付・金額など個人情報・取引情報が含まれるため、国内処理が要件（個人情報保護法・契約上）の場合は `GEMINI_LOCATION` を `asia-northeast1` 等のリージョンに必ず切り替える。
- **出力の非互換**: Gemini エンドポイントは `ReceiptExtraction` を返し、既存の `entities` 形式とは異なる。Web からの利用（エンジン切替 UI）は別 Issue で対応する。
- **金額の揺れ（受容リスク）**: モデル出力の数値表記揺れ（税込/税別・全角・カンマ）は infrastructure 層の正規化で吸収する。ただし**合計と税額・明細の整合検証は本 ADR のスコープでは行わない**。モデル誤出力が経理・税務処理に波及しうる点を**受け入れられるリスクとして明示的に記録**する（将来、application 層で `合計 ≒ 明細合計 + 税額` 等の整合検証を追加する余地を残す）。
