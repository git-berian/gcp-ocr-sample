# OCR Sample

Google Cloud Document AI を使用してレシート等の画像・PDF から情報を抽出する OCR ツールです。
npm workspaces によるモノレポ構成を採用しており、デプロイ単位ごとにパッケージを分離しています。

## モノレポ構成

| パッケージ           | 説明                                               |
| -------------------- | -------------------------------------------------- |
| `packages/cli`       | CLI ツール（Document AI による OCR）               |
| `packages/functions` | Cloud Functions HTTP API（Document AI による OCR） |

## 必要なもの

- Docker / Docker Compose
- GCP プロジェクト（Document AI API が有効化済み）
- Document AI プロセッサ（Expense Parser 等）
- サービスアカウントキー（JSON）

## セットアップ

### 1. サービスアカウントキーの配置

GCP コンソールからサービスアカウントキーをダウンロードし、`secrets/sa.json` として配置してください。

```
secrets/sa.json
```

### 2. 環境変数の設定

`.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp .env.example .env
```

| 変数名               | 説明                                                                  |
| -------------------- | --------------------------------------------------------------------- |
| `GCP_PROJECT_ID`     | GCP プロジェクト ID                                                   |
| `DOCAI_LOCATION`     | プロセッサのロケーション（`us` / `eu` 等）                            |
| `DOCAI_PROCESSOR_ID` | Document AI プロセッサ ID                                             |
| `FILE_NAME`          | `input/` 配下の解析対象ファイル名                                     |
| `MIME_TYPE`          | （任意）MIME タイプを明示する場合に指定。未指定時は拡張子から自動判定 |

### 3. 解析対象ファイルの配置

解析したい画像や PDF を `input/` ディレクトリに配置してください。

対応フォーマット: PDF (`.pdf`)、PNG (`.png`)、JPEG (`.jpg` / `.jpeg`)

### 4. Docker 環境の初期セットアップ

```bash
npm run docker:setup
```

個別に実行する場合は `npm run docker:cli:setup` / `npm run docker:functions:setup` も使えます。

## 使い方

開発コマンドは Docker 経由で実行します。ローカルの Node.js バージョンに依存しません。

### 開発コマンド

パッケージごとに `docker:cli:*` / `docker:functions:*` で実行します。

```bash
# CLI パッケージ
npm run docker:cli:lint           # ESLint 実行
npm run docker:cli:format:check   # Prettier チェック
npm run docker:cli:test           # テスト実行
npm run docker:cli:test:coverage  # テスト + カバレッジ計測
npm run docker:cli:sh             # コンテナに入って操作
npm run docker:cli:build          # Docker イメージのビルド

# Functions パッケージ
npm run docker:functions:lint           # ESLint 実行
npm run docker:functions:format:check   # Prettier チェック
npm run docker:functions:test           # テスト実行
npm run docker:functions:test:coverage  # テスト + カバレッジ計測
npm run docker:functions:sh             # コンテナに入って操作
npm run docker:functions:build          # Docker イメージのビルド
```

### コンテナ内での操作

```bash
npm run docker:cli:sh        # CLI コンテナ
npm run docker:functions:sh  # Functions コンテナ
```

コンテナ内では以下のコマンドも実行できます（`-w` は `--workspace` の短縮形）。

```bash
# CLI パッケージ
npm run build -w @docai/cli            # TypeScript ビルド
npm run lint:fix -w @docai/cli         # ESLint 自動修正
npm run format -w @docai/cli           # Prettier フォーマット
npm run test:unit -w @docai/cli        # ユニットテストのみ
npm run test:integration -w @docai/cli # 統合テストのみ
npm run test:coverage -w @docai/cli    # テスト + カバレッジ計測
npm run test:watch -w @docai/cli       # テスト実行（ウォッチモード）

# Functions パッケージ
npm run build -w @docai/functions            # TypeScript ビルド
npm run lint:fix -w @docai/functions         # ESLint 自動修正
npm run format -w @docai/functions           # Prettier フォーマット
npm run test:unit -w @docai/functions        # ユニットテストのみ
npm run test:coverage -w @docai/functions    # テスト + カバレッジ計測
npm run test:watch -w @docai/functions       # テスト実行（ウォッチモード）
```

### CLI で OCR を実行する

開発コンテナ内で実行する場合:

```bash
npm run docker:cli:sh
# コンテナ内で
npm run build -w @docai/cli
npm run start -w @docai/cli
```

本番用の docker-compose で一括実行する場合:

```bash
docker-compose -f packages/cli/docker/docker-compose.prod.yml up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。

### Functions をローカルで実行する

`--service-ports` でホストにポート 8080 を公開してコンテナに入ります。

```bash
docker-compose -f packages/functions/docker/docker-compose.yml run --rm --service-ports functions bash
# コンテナ内で
npm run build -w @docai/functions
npm run start -w @docai/functions
```

ローカルサーバーが起動したら、別ターミナルから curl でリクエストできます。

```bash
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d "{\"content\": \"$(base64 -i input/receipt.jpg | tr -d '\n')\", \"mimeType\": \"image/jpeg\"}"
```

## アーキテクチャ

DDD（ドメイン駆動設計）に基づく 3 層構成を採用しています。

| レイヤー               | ディレクトリ                       | 責務                                                         |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **ドメイン層**         | `packages/cli/src/domain/`         | 純粋なビジネスロジック（外部依存なし）                       |
| **アプリケーション層** | `packages/cli/src/application/`    | ユースケースの実行。インターフェースを通じてインフラ層に依存 |
| **インフラ層**         | `packages/cli/src/infrastructure/` | 外部サービス連携（GCP Document AI・ファイル I/O・環境変数）  |

エントリーポイント（`packages/cli/src/index.ts`）は依存注入のワイヤリングのみを行い、具体的なロジックは持ちません。

`packages/functions` も同様の層構成に加え、`handlers/` 層（HTTP リクエスト処理）を持ちます。

## Docker 構成

| ファイル                                      | 用途     | 説明                                                    |
| --------------------------------------------- | -------- | ------------------------------------------------------- |
| `packages/cli/docker/Dockerfile`              | 開発環境 | Node.js 20 ベースイメージ（ソースはボリュームマウント） |
| `packages/cli/docker/Dockerfile.prod`         | 本番環境 | マルチステージビルドで本番依存のみ含む                  |
| `packages/cli/docker/docker-compose.yml`      | 開発環境 | `Dockerfile` を使用                                     |
| `packages/cli/docker/docker-compose.prod.yml` | 本番環境 | `Dockerfile.prod` を使用                                |

## ディレクトリ構成

```
.
├── packages/
│   ├── cli/                           # CLI パッケージ（将来削除予定）
│   │   ├── docker/
│   │   │   ├── Dockerfile              # 開発環境用
│   │   │   ├── Dockerfile.prod         # 本番環境用
│   │   │   ├── docker-compose.yml      # 開発環境用
│   │   │   └── docker-compose.prod.yml # 本番環境用
│   │   ├── src/
│   │   │   ├── domain/                 # ドメイン層
│   │   │   ├── application/            # アプリケーション層
│   │   │   ├── infrastructure/         # インフラ層
│   │   │   └── index.ts                # エントリーポイント（依存注入）
│   │   ├── tests/
│   │   │   ├── helpers/                # 共有テストユーティリティ
│   │   │   └── integration/            # 統合テスト
│   │   ├── package.json
│   │   ├── tsconfig.json               # ビルド用（ルートを extends）
│   │   ├── tsconfig.test.json          # テスト用
│   │   ├── vitest.config.ts
│   │   └── eslint.config.js
│   └── functions/                     # Cloud Functions パッケージ
│       ├── src/
│       │   ├── domain/                 # ドメイン層
│       │   ├── application/            # アプリケーション層
│       │   ├── infrastructure/         # インフラ層
│       │   ├── handlers/               # HTTP ハンドラ層
│       │   └── index.ts                # エントリーポイント
│       ├── package.json
│       ├── tsconfig.json
│       ├── vitest.config.ts
│       └── eslint.config.js
├── .claude/
│   └── skills/                        # Claude Code スキル定義
├── .github/
│   ├── ISSUE_TEMPLATE/                # Issue テンプレート
│   ├── workflows/                     # GitHub Actions（CI）
│   ├── pull_request_template.md       # PR テンプレート
│   └── dependabot.yml                 # Dependabot 設定
├── .husky/                             # Git フック（lint-staged）
├── docs/
│   ├── adr/                           # ADR（アーキテクチャ決定記録）
│   └── ai-development-guidelines.md   # AI駆動開発ガイドライン
├── .dockerignore                        # Docker ビルド除外設定
├── package.json                        # workspaces ルート
├── tsconfig.json                       # 共通 TypeScript ベース設定
├── CONTRIBUTING.md                     # 開発ガイド
├── input/                              # 解析対象ファイルを配置
├── logs/                               # 解析結果ログ
└── secrets/                            # サービスアカウントキー（git管理外）
```

## 技術スタック

| Tool                     | Version                            |
| ------------------------ | ---------------------------------- |
| Node.js                  | 20 (Docker イメージ: node:20-slim) |
| TypeScript               | ^5.9                               |
| Vitest                   | ^4.0                               |
| ESLint                   | ^10.0                              |
| Prettier                 | ^3.8                               |
| @google-cloud/documentai | ^9.5.0                             |

## 開発に参加する

- 開発規約・ワークフロー → [CONTRIBUTING.md](./CONTRIBUTING.md)
- アーキテクチャ決定記録 → [docs/adr/](./docs/adr/)
- AI駆動開発ガイドライン → [docs/ai-development-guidelines.md](./docs/ai-development-guidelines.md)
