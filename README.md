# OCR Sample

Google Cloud Document AI を使用してレシート等の画像・PDF から情報を抽出する OCR ツールです。
npm workspaces によるモノレポ構成を採用しており、デプロイ単位ごとにパッケージを分離しています。

## モノレポ構成

| パッケージ       | 説明                          |
| ---------------- | ----------------------------- |
| `packages/api`   | API（Document AI による OCR） |

今後、フロントエンドや共有ライブラリが必要になった場合は `packages/` 配下にパッケージを追加します。

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

## 使い方

### コンテナのビルド

```bash
# 開発環境
docker-compose -f packages/api/docker/docker-compose.yml build

# 本番環境
docker-compose -f packages/api/docker/docker-compose.prod.yml build
```

### コンテナに入って操作する

```bash
docker-compose -f packages/api/docker/docker-compose.yml run --rm ocr bash
```

コンテナ内で以下のコマンドが実行できます。

```bash
npm run build            # TypeScript ビルド
npm run lint             # ESLint 実行
npm run lint:fix         # ESLint 自動修正
npm run format           # Prettier フォーマット
npm run format:check     # Prettier チェック
npm run test             # テスト実行（全プロジェクト）
npm run test:unit        # ユニットテストのみ
npm run test:integration # 統合テストのみ
npm run test:watch       # テスト実行（ウォッチモード）
node dist/index.js       # OCR 実行
```

### OCR を直接実行する

```bash
# 開発環境
docker-compose -f packages/api/docker/docker-compose.yml up --build

# 本番環境
docker-compose -f packages/api/docker/docker-compose.prod.yml up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。

## アーキテクチャ

DDD（ドメイン駆動設計）に基づく 3 層構成を採用しています。

| レイヤー               | ディレクトリ                       | 責務                                                         |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------ |
| **ドメイン層**         | `packages/api/src/domain/`         | 純粋なビジネスロジック（外部依存なし）                       |
| **アプリケーション層** | `packages/api/src/application/`    | ユースケースの実行。インターフェースを通じてインフラ層に依存 |
| **インフラ層**         | `packages/api/src/infrastructure/` | 外部サービス連携（GCP Document AI・ファイル I/O・環境変数）  |

エントリーポイント（`packages/api/src/index.ts`）は依存注入のワイヤリングのみを行い、具体的なロジックは持ちません。

## Docker 構成

| ファイル                                    | 用途     | 説明                                   |
| ------------------------------------------- | -------- | -------------------------------------- |
| `packages/api/docker/Dockerfile`            | 開発環境 | 全依存インストール + TypeScript ビルド |
| `packages/api/docker/Dockerfile.prod`       | 本番環境 | マルチステージビルドで本番依存のみ含む |
| `packages/api/docker/docker-compose.yml`    | 開発環境 | `Dockerfile` を使用                    |
| `packages/api/docker/docker-compose.prod.yml` | 本番環境 | `Dockerfile.prod` を使用             |

## ディレクトリ構成

```
.
├── packages/
│   └── api/                           # API パッケージ
│       ├── .dockerignore
│       ├── docker/
│       │   ├── Dockerfile              # 開発環境用
│       │   ├── Dockerfile.prod         # 本番環境用
│       │   ├── docker-compose.yml      # 開発環境用
│       │   └── docker-compose.prod.yml # 本番環境用
│       ├── src/
│       │   ├── domain/                 # ドメイン層
│       │   ├── application/            # アプリケーション層
│       │   ├── infrastructure/         # インフラ層
│       │   ├── index.ts                # エントリーポイント（依存注入）
│       │   └── index.test.ts
│       ├── tests/
│       │   ├── helpers/                # 共有テストユーティリティ
│       │   └── integration/            # 統合テスト
│       ├── package.json
│       ├── tsconfig.json               # ビルド用（ルートを extends）
│       ├── tsconfig.test.json          # テスト用
│       ├── vitest.config.ts
│       └── eslint.config.js
├── .claude/
│   └── skills/                        # Claude Code スキル定義
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
| @google-cloud/documentai | ^9.0.0                             |

## 開発に参加する

開発規約・ワークフローについては [CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。
