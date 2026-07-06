# @docai/functions

Document AI を使用した OCR 機能を Firebase Functions HTTP API として提供するパッケージです。

## 開発コマンド

```bash
npm run docker:functions:lint           # ESLint 実行
npm run docker:functions:lint:fix       # ESLint 自動修正
npm run docker:functions:format:check   # Prettier チェック
npm run docker:functions:format         # Prettier フォーマット
npm run docker:functions:test           # テスト実行（全テスト）
npm run docker:functions:test:unit     # ユニットテストのみ実行
npm run docker:functions:test:integration  # 結合テストのみ実行
npm run docker:functions:test:coverage  # テスト + カバレッジ計測
npm run docker:functions:start          # ビルド＋Firebase Emulator 起動
npm run docker:functions:sh             # コンテナに入って操作
npm run docker:functions:build          # TypeScript ビルド
```

### コンテナ内での操作

```bash
npm run docker:functions:sh
# コンテナ内で
npm run build            # TypeScript ビルド
npm run start            # ビルド＋Firebase Emulator 起動
npm run shell            # ビルド＋Firebase Functions Shell
npm run lint:fix         # ESLint 自動修正
npm run format           # Prettier フォーマット
npm run test             # テスト実行（全テスト）
npm run test:unit        # ユニットテストのみ
npm run test:integration # 結合テストのみ
npm run test:coverage    # テスト + カバレッジ計測
npm run test:watch       # テスト実行（ウォッチモード）
```

## テスト構成

テストは Vitest のプロジェクト機能で **unit**（単体テスト）と **integration**（結合テスト）に分離しています。

| 種別        | 配置場所                         | 説明                                                          |
| ----------- | -------------------------------- | ------------------------------------------------------------- |
| unit        | `src/**/*.test.ts`               | ソースコードと同じディレクトリに配置。依存は個別にモック      |
| integration | `tests/integration/**/*.test.ts` | ハンドラを実際の依存グラフで結合して検証。外部 API のみモック |

結合テストのヘルパー（フィクスチャ・モック）は `tests/integration/helpers/` にまとめています。

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
npm run shell
# シェル内で関数を呼び出し
parseDocument({method: "POST", body: {content: "base64data", mimeType: "application/pdf"}})
```

## 環境変数

Firebase Functions は[環境構成ファイル](https://firebase.google.com/docs/functions/config-env?gen=2nd)を使って環境変数を管理します。

| ファイル            | 用途                                 | 読み込みタイミング                                                        |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------- |
| `.env`              | デフォルト設定（全プロジェクト共通） | デプロイ時・エミュレータ起動時                                            |
| `.env.<project-id>` | プロジェクト固有の設定               | `.env` より優先。`--project` で指定したプロジェクト ID に一致するファイル |
| `.env.local`        | ローカル開発用オーバーライド         | エミュレータ起動時のみ（デプロイには含まれない）                          |
| `.env.example`      | 設定項目のリファレンス（git 管理）   | —                                                                         |

### 必要な環境変数

`.env` または `.env.<project-id>` に設定します。

| 変数名               | 必須 | 説明                                                |
| -------------------- | ---- | --------------------------------------------------- |
| `GCP_PROJECT_ID`     | Yes  | GCP プロジェクト ID                                 |
| `DOCAI_LOCATION`     | Yes  | Document AI のロケーション（例: `asia-southeast1`） |
| `DOCAI_PROCESSOR_ID` | Yes  | Document AI プロセッサ ID                           |

### FUNCTIONS_API_KEY の管理

`parseDocumentHttp`（onRequest）は Bearer トークンによる呼び出し側 API キー認証を行います。

- **ローカル開発**: `.env.local` に `FUNCTIONS_API_KEY=<値>` を設定（エミュレータが読み込む）
- **デプロイ環境**: Google Cloud Secret Manager で管理（後述）

コード上は `defineSecret("FUNCTIONS_API_KEY")` で宣言し、`secrets: [functionsApiKey]` で関数に注入しています。

### Claude 認証（ANTHROPIC_API_KEY / CLAUDE_TRANSPORT）

`parseDocumentClaude*` は Claude の呼び出し経路を `CLAUDE_TRANSPORT` で切り替えます（ADR-0013）。

- `CLAUDE_TRANSPORT=api`（既定）: Anthropic 直接 API。`ANTHROPIC_API_KEY` を使用。
- `CLAUDE_TRANSPORT=vertex`: Vertex AI 経由（ADC 認証）。`ANTHROPIC_API_KEY` は未使用。

- **ローカル開発**: api 経路を試す場合、`.env.local` に `ANTHROPIC_API_KEY=<値>` を設定（エミュレータが読み込む）。
- **デプロイ環境**: Google Cloud Secret Manager で管理（後述）。

コード上は `defineSecret("ANTHROPIC_API_KEY")` で Claude 関数に宣言しています。**この宣言は `CLAUDE_TRANSPORT` の値に関わらず有効なため、`vertex` 運用でも Secret Manager に `ANTHROPIC_API_KEY`（ダミー値可）が存在しないとデプロイに失敗します。**

## デプロイ

デプロイ前に以下の準備が必要です：

- **GCP 側**: Firebase プロジェクトの作成（GCP プロジェクトと紐づけ）、Blaze プラン（従量課金）へのアップグレード
- **GCP 側**: Document AI API の有効化、プロセッサの作成
- **GCP 側**: Secret Manager API の有効化（GCP コンソール → 「APIとサービス」→「Secret Manager API」を有効化）
- **ローカル**: `.env` に環境変数を設定（`.env.example` を参照）

### Secret Manager のセットアップ

HTTP 関数は API キーを Secret Manager から取得します。初回デプロイ前に**両方**のシークレットを設定してください。

- `FUNCTIONS_API_KEY`: HTTP エンドポイント（`parseDocument*Http`）の呼び出し側認証キー。
- `ANTHROPIC_API_KEY`: Claude 直接 API 経路用。Claude 関数に `defineSecret` 宣言があるため、`CLAUDE_TRANSPORT=vertex` 運用でも設定が必要（ダミー値可。未設定だとデプロイに失敗）。

```bash
npm run docker:functions:sh

# コンテナ内で
firebase functions:secrets:set FUNCTIONS_API_KEY --project <project-id>
firebase functions:secrets:set ANTHROPIC_API_KEY --project <project-id>
# プロンプトに従って値を入力
```

設定済みのシークレットは以下で確認できます。

```bash
firebase functions:secrets:get FUNCTIONS_API_KEY --project <project-id>
```

### デプロイの実行

```bash
npm run docker:functions:sh

# コンテナ内で
firebase login --no-localhost  # 初回のみ
firebase deploy --only functions --project <project-id>
```
