# @docai/functions

Document AI を使用した OCR 機能を Firebase Functions HTTP API として提供するパッケージです。

## 開発コマンド

```bash
npm run docker:functions:lint           # ESLint 実行
npm run docker:functions:format:check   # Prettier チェック
npm run docker:functions:test           # テスト実行
npm run docker:functions:test:coverage  # テスト + カバレッジ計測
npm run docker:functions:start          # ビルド＋Firebase Emulator 起動
npm run docker:functions:sh             # コンテナに入って操作
npm run docker:functions:build          # Docker イメージのビルド
```

### コンテナ内での操作

```bash
npm run docker:functions:sh
# コンテナ内で
npm run build -w @docai/functions            # TypeScript ビルド
npm run start -w @docai/functions            # ビルド＋Firebase Emulator 起動
npm run shell -w @docai/functions            # ビルド＋Firebase Functions Shell
npm run lint:fix -w @docai/functions         # ESLint 自動修正
npm run format -w @docai/functions           # Prettier フォーマット
npm run test:unit -w @docai/functions        # ユニットテストのみ
npm run test:coverage -w @docai/functions    # テスト + カバレッジ計測
npm run test:watch -w @docai/functions       # テスト実行（ウォッチモード）
```

## ローカル実行

Docker コンテナ内で Firebase Emulator を使用してローカル実行します。

```bash
npm run docker:functions:start
```

起動すると以下のようなログが表示されます：

```text
✔  functions[<region>-parseDocument]: http function initialized
    (http://127.0.0.1:8080/<project-id>/<region>/parseDocument)
```

リージョンは `onRequest` のオプションで指定した値（現在: `asia-northeast1`）です。

### curl でリクエスト

ローカルサーバーが起動したら、別ターミナルから curl でリクエストできます。
URL は `http://localhost:8080/<project-id>/<region>/parseDocument` の形式です。

```bash
# エミュレータ起動時のログに表示される URL を使用
# 例: http://localhost:8080/your-gcp-project-id/asia-northeast1/parseDocument
FUNCTION_URL="http://localhost:8080/your-gcp-project-id/asia-northeast1/parseDocument"

# リクエスト用 JSON ファイルを作成
CONTENT=$(base64 -i input/receipt.jpg | tr -d '\n')
printf '{"content":"%s","mimeType":"image/jpeg"}' "$CONTENT" > /tmp/request.json

# curl でリクエスト（-d @ でファイルから読み込み）
curl -s -X POST "${FUNCTION_URL}" \
  -H "Content-Type: application/json" \
  -d @/tmp/request.json
```

### 対話型シェル

```bash
npm run docker:functions:sh
# コンテナ内で
npm run shell -w @docai/functions
# シェル内で関数を呼び出し
parseDocument({method: "POST", body: {content: "base64data", mimeType: "application/pdf"}})
```

## デプロイ

デプロイ前に以下の準備が必要です：

- **GCP 側**: Firebase プロジェクトの作成（GCP プロジェクトと紐づけ）、Blaze プラン（従量課金）へのアップグレード
- **GCP 側**: Document AI API の有効化、プロセッサの作成
- **ローカル**: `packages/functions/.env.<project-id>` に環境変数を設定（`GCP_PROJECT_ID`, `DOCAI_LOCATION`, `DOCAI_PROCESSOR_ID`）

```bash
npm run docker:functions:sh

# コンテナ内で
firebase login --no-localhost  # 初回のみ
firebase deploy --only functions --project <project-id>
```
