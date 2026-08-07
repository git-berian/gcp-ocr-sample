# ADR-0014: Gemini 2.5 廃止に伴い既定モデルを gemini-3.5-flash-lite に移行

## ステータス

提案

## コンテキスト

Google から、Gemini Enterprise Agent Platform（旧 Vertex AI）の **Gemini 2.5 系（Flash Lite / Flash / Pro）を 2026-10-20 に廃止（ELA 入り）** する通知があった。影響プロジェクトとして本リポジトリの `GCP_PROJECT_ID` である `documentaisample-488504` が名指しされている。

- **2026-10-20**: ELA（Extended Lifecycle Access）入り。呼び出しは継続可能で価格も据え置き
- **2027-01-28**: ELA 標準価格が終了し**大幅値上げ**。リージョン提供状況も変わりうる

ADR-0010 で採用した既定モデルは `gemini-2.5-flash`（`packages/functions/src/infrastructure/config.ts`）であり、廃止対象そのものである。`GEMINI_LOCATION` の既定は `global` のため、通知にある DRZ（韓国・ブラジル・フランス）例外の対象外。

呼び出しが即停止するわけではないため障害リスクは低い。一方で ADR-0010 が記録したコスト前提（`thinkingBudget:0` での平均 $0.00175/枚 = Document AI の約 1/57）は 2.5 系の実測値であり、モデル交代で失効する。Gemini 3 系は thinking 制御に `thinking_level` を導入しており、旧 `thinking_budget` との併用は 400 エラーになるため、**机上判断ではなく実測で移行先を決める必要があった**。

## 決定

**既定モデルを `gemini-2.5-flash` から `gemini-3.5-flash-lite` に変更する。**

- `packages/functions/src/infrastructure/config.ts` の `loadGeminiConfig()` の既定値、および `packages/functions/.env.example` を更新する
- `GEMINI_LOCATION` の既定は `global` のまま変更しない
- `thinkingConfig: { thinkingBudget: 0 }` は**現状維持**する（Gemini 3 系でもそのまま通り、thinking は無効化される）
- `responseSchema`（`RECEIPT_RESPONSE_SCHEMA`）による構造化 JSON 出力も現状維持する
- 本 ADR は方針の意思決定のみを扱い、コード変更は別 PR で行う

## 理由

### 実測結果（2026-08-07 / `input/` 5枚 / `global` / `thinkingBudget:0` / `temperature:0`）

本番実装（`gemini-client.ts`）と同一のプロンプト・`responseSchema` を使い、モデルのみ差し替えて計測した（計測スクリプトと正解データは領収書の個人情報を含むためコミットせず、`tasks/` 配下にローカル保持する）。サンプルは印字 3 枚・手書き 2 枚（うち 1 枚は和暦 `R8年5月9日` → `2026-05-09` の変換を要する）。採点対象は `supplierName` / `receiptDate` / `totalAmount` / `taxAmount` / `registrationNumber` の 5 項目 × 5 枚 = 25 項目。

| モデル                               | 精度      | 入力トークン | 平均 $/枚     | 現行比  | 平均レイテンシー |
| ------------------------------------ | --------- | ------------ | ------------- | ------- | ---------------- |
| `gemini-2.5-flash`（現行・廃止対象） | 24/25     | 3,520        | $0.001649     | —       | 3,279ms          |
| **`gemini-3.5-flash-lite`**          | **25/25** | **1,366**    | **$0.001061** | **64%** | 3,051ms          |
| `gemini-3.1-flash-lite`              | 25/25     | 1,366        | $0.000695     | 42%     | 3,119ms          |
| `gemini-3.5-flash`                   | 25/25     | 1,366        | $0.004412     | 268%    | 2,962ms          |

- **精度は 4 モデルとも横並び**。`gemini-2.5-flash` の 1 件の差は店名に含まれる漢字を Unicode 異体字（U+541E / U+5451）で出力したもので、実質的な誤読ではない。手書き・和暦変換を含めて全モデルが正答したため、**この 5 枚では精度は移行先の判断材料にならない**
- **コストは全候補が現行より安い**。Gemini 3 系は同一画像の入力トークンが 3,520 → **1,366（61% 減）** となり、単価が同じ `gemini-3.5-flash-lite` でも実コストが 36% 下がる
- **レイテンシーは有意差なし**（2.9〜3.3 秒）

### `gemini-3.5-flash-lite` を選ぶ理由

- **`gemini-3.1-flash-lite` は最安（現行の 42%）だが、既に廃止日 2027-05-07 が設定済み**で、Google 自身が移行先として `gemini-3.5-flash-lite` を案内している。採用すれば 1 年以内に再移行が必要になり、今回と同じ作業を繰り返す
- `gemini-3.5-flash-lite`（2026-07-21 リリース）は**廃止日が未設定**で、Flash-Lite 系の最新。精度は同点、コストは現行より 36% 安く、1 回の移行で当面の寿命を確保できる
- `gemini-3.5-flash` は精度同点でコストが現行の 2.7 倍。本用途（単ページ領収書の構造化抽出）に見合わない
- 月額試算: 1,000枚 **$1.06**（現行 $1.65 / Document AI $100）、10,000枚 **$10.61**（現行 $16.50 / Document AI $1,000）。ADR-0010 の「Document AI より大幅に安価」という前提は維持される（約 1/94 に改善）

### 互換性の確認結果

- **`thinkingBudget:0` は Gemini 3 系（3.1 / 3.5 Flash-Lite / 3.5 Flash）でもエラーにならず受理された**。全モデルで `thoughtsTokenCount = 0` を確認しており、thinking は実際に無効化されている。**コード変更は不要**
- `responseSchema` による構造化 JSON 出力は全モデルで機能し、JSON 解析エラー・スキーマ不一致は 0 件
- **thought signature の循環は本実装では不要**。通知では Gemini 3 系での実装が求められているが、本実装は `generateContent` の単発呼び出しでマルチターン会話・function calling を行わないため、循環させる後続リクエストが存在しない

## 影響

- **コード変更**: `config.ts` の既定モデル文字列 1 行と `.env.example` のみ。`GEMINI_MODEL` で切替可能な設計（ADR-0010）が効いており、`gemini-client.ts` 本体・`ReceiptExtraction` 型・正規化処理は変更不要
- **テスト**: 既定値を検証している `config.test.ts` / `gemini-client.test.ts` / `handlers/parse-document-gemini*.test.ts` / `tests/integration/helpers/fixtures.ts` のモデル文字列を更新する必要がある
- **ドキュメント**: ADR-0010 のコスト実測値（$0.00175/枚・3,493 トークン）は 2.5 系の値として残し、本 ADR が更新値を持つ。`packages/functions/README.md` の環境変数表に既定値の記載がある場合は同 PR で更新する
- **デプロイ環境**: `GEMINI_MODEL` を明示設定している環境があれば、そちらも更新が必要（設定していなければ既定値の変更で追随する）
- **精度の再検証**: 本比較はサンプル 5 枚のパイロットであり統計的有意性はない。ADR-0010 と同じく、本番適用前にサンプルを拡大した検証が望ましい。ただし全候補が同点だったため、**移行によって精度が下がる兆候は観測されていない**
- **単価の前提**: 上表は `global` エンドポイント・Standard（非キャッシュ）の公開単価に基づく。非 global リージョンは約 +10%。データレジデンシー要件で `GEMINI_LOCATION` を `asia-northeast1` 等に変更する場合（ADR-0010 参照）、コストは 1 割程度上振れる
- **将来の再移行**: `thinking_budget` は Gemini 3 系では旧パラメータであり、`thinking_level` への置き換えが将来必要になる可能性がある。`thinking_level` と `thinking_budget` の併用は 400 エラーになるため、切り替える際は同時指定しないこと
- **本通知の対象外**: Claude 経路（ADR-0012 / ADR-0013）および Document AI 経路（ADR-0002）は影響を受けない

## 出典

- 単価: [Generative AI on Vertex AI pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing)（2026-08-07 参照。`global` / Standard・非キャッシュ）
- 廃止日・リリース日: [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations) / [Model versions and lifecycle](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions)（2026-08-07 参照）
- ELA の日程・移行先候補: Google からの Gemini 2.5 廃止通知メール（2026-08 受信）
- なお公式ドキュメント上の Gemini 2.5 系の retirement 日は 2026-10-16 と記載されており、通知メールの 2026-10-20 と数日ずれる。いずれにせよ 2026-10 中に ELA へ移行する点は変わらない

## 代替案

- **`gemini-3.1-flash-lite` を採用**: 最安だが廃止日が設定済みで、1 年以内の再移行が確定する。コスト差（10,000枚で年間 $3.66）は再移行の作業コストに見合わない
- **`gemini-3.5-flash` を採用**: 精度が同点である以上、コスト 2.7 倍を正当化できない。将来サンプルを拡大した検証で Flash-Lite の精度不足が判明した場合の昇格先として残す
- **ELA のまま据え置く**: 2027-01-28 以降に大幅値上げが確定しており、移行コストが小さい（設定値 1 行）以上、先送りする理由がない
