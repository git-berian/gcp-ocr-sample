# ADR-0011: レスポンス構造を正準モデル ReceiptExtraction に統一する

## ステータス

提案

## コンテキスト

領収書解析の抽出結果を返すエンドポイントが、engine ごとに異なるレスポンス構造を持っている。

- Document AI 版（`parseDocumentCall` / `parseDocumentHttp`）: `{ entities: ExtractedField[] }`（Document AI の生エンティティ形式 `{ type, mentionText, confidence }`）
- Gemini 版（`parseDocumentGeminiCall` / `parseDocumentGeminiHttp`、ADR-0010）: `{ receipt: ReceiptExtraction }`（構造化型）

この不統一により、**エンジンを透明に切り替えられない**（利用側が engine ごとに分岐せざるを得ない）。ADR-0010 で Gemini を並列採用した本来の目的（engine を差し替え可能にする）が果たせていない。

さらに `ExtractedField[]` は **Document AI の生形式が application 層を素通りして API に露出**している。これは ADR-0009 が「`DocumentProcessor` は外部サービスゲートウェイ（Anti-Corruption Layer）」と位置づけた方針に反する、抽象の漏れである。

## 決定

両 engine のレスポンスを、application 層が所有する**正準モデル `ReceiptExtraction` に統一**する。

- 全4エンドポイントが `{ receipt: ReceiptExtraction }` を返す。
- 各 engine の infrastructure アダプタが、自分の生出力を正準モデルにマッピングする（Anti-Corruption Layer を実装）。`ExtractedField` は infra 層に閉じ込め、application からは撤去する。
- **取得必須項目**: 支払日（`receiptDate`）／店名（`supplierName`）／金額（`totalAmount`）／**登録番号（`registrationNumber`）**。登録番号はインボイス登録番号（T+13桁）で、領収書に無ければ `null`。
- 加えて `taxAmount`（税額）と `transcription`（書き起こし）を保持する。**明細（`lineItems`）は取得対象外**とする。
- Document AI の per-field confidence は失わないよう、任意の `meta`（`{ source, confidence? }`）に退避する。Gemini 版は `meta.source = "gemini"`。

正準モデル:

```ts
interface ReceiptExtraction {
  supplierName: string | null;
  receiptDate: string | null; // YYYY-MM-DD（支払日）
  totalAmount: number | null;
  taxAmount: number | null;
  registrationNumber: string | null; // インボイス登録番号（T+13桁）。無ければ null
  transcription: string;
  meta?: { source: "document-ai" | "gemini"; confidence?: Record<string, number> };
}
```

これは **Web の受け取り側も変わる破壊的変更**であり、Functions と Web を同時に改修・デプロイする。Web のエンジン切替 UI は引き続き別 Issue とする。本 ADR は方針の意思決定のみを扱い、コード実装は別 PR で行う。

## 理由

- **engine 透明化**: 統一レスポンスにより、利用側が engine ごとに分岐せず切替可能になる。ADR-0010 で並列採用した目的を達成する。
- **Anti-Corruption Layer の実現（ADR-0009 整合）**: 正準モデルを application 層が所有し、Document AI の `ExtractedField` を infra 層に閉じ込めることで、抽象の漏れを是正する。将来 engine を追加・差し替える際も application/handler は無変更で済む。
- **必須項目の明確化**: 経費処理に必要な最小項目（支払日・店名・金額・登録番号）を型で保証する。登録番号は領収書により存在しないため `null` 許容。
- **明細を外す判断**: 明細は Document AI ではネスト構造でノイジー、経費処理の最小要件でもないため、複雑さとリスクを避けて対象外とする。必要になれば別途追加できる。
- **confidence を捨てない**: Document AI は per-field confidence を持つため、`meta` に退避して情報を保持する。Gemini は持たないため optional とし両者互換にする。

代替案として「Gemini を `ExtractedField[]` 互換にする」「非破壊で両フィールドを併存させる」「新バージョン別エンドポイントを立てる」も検討したが、前者は Gemini の構造化の利点を失い、後二者はレガシー形式を残し不統一が続くため却下した（ユーザー決定）。

## 影響

必須チェック観点（ADR テンプレート準拠）:

- **コスト**: 新たな API 課金は発生しない。Document AI が `document.text` を返す分は追加課金なし。Gemini 側は明細を外す分わずかに出力トークンが減る可能性がある。
- **クォータ・レート制限**: 該当なし（呼び出し方は不変）。
- **レイテンシー**: 該当なし（処理内容は不変。マッピングは無視できる）。
- **データレジデンシー・個人情報**: 該当なし（送信先・処理リージョンは不変）。`transcription`・`meta` の追加でレスポンスに含む情報が増えるが、いずれも同一領収書由来の情報で新たな外部送信は無い。
- **コンプライアンス・セキュリティ**: 新たな権限・シークレットは不要。Document AI ハンドラのログを entity 列挙から receipt 要約へ変更し、ログ方針を Gemini 版と揃える。
- **受容リスク**: Document AI のマッピングは best-effort であり、ノイジーな OCR 出力では各フィールドが `null`・誤値になりうる（Gemini より精度が劣るのは既知。engine 切替は別 Issue）。合計と税額の整合検証は行わない。明細は取得対象外。

その他:

- **破壊的変更**: Document AI エンドポイントのレスポンスが `{ entities }` → `{ receipt }` に変わる。Web（`ResultTable` 等）と API キー経由の外部利用者に影響。Functions と Web は同時デプロイが必須。
- **既存型の撤去**: application 層の `DocumentProcessor` / `ExtractedField` / `parseDocument` を撤去し、`ReceiptExtractor` / `extractReceipt` に一本化する。
- **共通化**: 金額・文字列の正規化ロジックを共有モジュールに切り出し、Document AI / Gemini 双方のアダプタで再利用する。
