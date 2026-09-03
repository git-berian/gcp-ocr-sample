# OCR Sample

Google Cloud Document AI・Vertex AI Gemini・Claude（Anthropic）を抽出エンジンに使い、レシート等の画像・PDF から情報を抽出する OCR ツールです。
モノレポ構成を採用しており、デプロイ単位ごとにパッケージを分離しています。各パッケージは独立した `node_modules` と `package-lock.json` を持ちます。

## モノレポ構成

| パッケージ                                  | 説明                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| [`packages/functions`](packages/functions/) | Firebase Functions HTTP API（Document AI / Gemini / Claude による OCR） |
| [`packages/web`](packages/web/)             | Web フロントエンド（React + Vite SPA）                                  |

## 必要なもの

共通:

- Docker / Docker Compose
- GCP プロジェクトとサービスアカウントキー（JSON）— GCP 認証（ADC）に使用
- Firebase CLI（`npm install -g firebase-tools`）— Functions のデプロイ時に必要

抽出エンジンは Web の UI から選択でき（既定は Document AI）、Functions は各エンジンに対応する関数を提供します。前提（設定変数は `packages/functions/.env.example` 参照）:

- **Document AI**（既定 / `parseDocument*`）: Document AI API の有効化、プロセッサ（Expense Parser 等）
- **Vertex AI Gemini**（`parseDocumentGemini*`）: Vertex AI API の有効化（認証はサービスアカウントの ADC を流用。ADR-0010）
- **Claude**（`parseDocumentClaude*`）: 直接 API（`CLAUDE_TRANSPORT=api`・既定）は Anthropic API キー（`ANTHROPIC_API_KEY`）、Vertex 経由（`CLAUDE_TRANSPORT=vertex`）は Vertex AI 上での Claude 有効化（ADR-0012 / 0013）。なお `vertex` は組織のポリシーで構造化出力が許可されている必要があり、本プロジェクトの GCP 環境では 2026-08-14 時点で利用できません（ADR-0013「Vertex 経路の再評価」参照）

## セットアップ

### 1. サービスアカウントキーの配置

GCP コンソールからサービスアカウントキーをダウンロードし、`secrets/sa.json` として配置してください。

```
secrets/sa.json
```

### 2. 環境変数の設定

各パッケージの `.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp packages/functions/.env.example packages/functions/.env
cp packages/web/.env.example packages/web/.env
```

各パッケージで必要な環境変数の詳細は、それぞれの `.env.example` を参照してください。

### 3. 解析対象ファイルの配置

解析したい画像や PDF を `input/` ディレクトリに配置してください。

対応フォーマット: PDF (`.pdf`)、PNG (`.png`)、JPEG (`.jpg` / `.jpeg`)

### 4. Docker 環境の初期セットアップ

```bash
npm run docker:setup
```

個別に実行する場合は `npm run docker:functions:setup` / `npm run docker:web:setup` も使えます。

## 使い方

開発コマンドは Docker 経由で実行します。ローカルの Node.js バージョンに依存しません。
各パッケージの詳細な使い方は、それぞれの README を参照してください。

- [Functions パッケージ](packages/functions/)
- [Web パッケージ](packages/web/)

## アーキテクチャ

DDD（ドメイン駆動設計）に基づく 3 層構成を採用しています。

| レイヤー               | ディレクトリ                             | 責務                                                         |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| **ハンドラ層**         | `packages/functions/src/handlers/`       | HTTP リクエスト処理                                          |
| **ドメイン層**         | `packages/functions/src/domain/`         | 純粋なビジネスロジック（外部依存なし）                       |
| **アプリケーション層** | `packages/functions/src/application/`    | ユースケースの実行。インターフェースを通じてインフラ層に依存 |
| **インフラ層**         | `packages/functions/src/infrastructure/` | 外部サービス連携（Document AI / Gemini / Claude・環境変数）  |

エントリーポイント（`packages/functions/src/index.ts`）は Cloud Functions の関数登録のみを行い、具体的なロジックは持ちません。

## Docker 構成

| ファイル                                    | 用途   | 説明                                      |
| ------------------------------------------- | ------ | ----------------------------------------- |
| `packages/web/docker/Dockerfile.playwright` | テスト | Playwright ブラウザ同梱イメージ（VRT 用） |

## ディレクトリ構成

```
.
├── packages/
│   ├── functions/                     # Firebase Functions パッケージ
│   │   ├── src/
│   │   │   ├── domain/                 # ドメイン層
│   │   │   ├── application/            # アプリケーション層
│   │   │   ├── infrastructure/         # インフラ層
│   │   │   ├── handlers/               # HTTP ハンドラ層
│   │   │   └── index.ts                # エントリーポイント
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── eslint.config.js
│   └── web/                           # Web フロントエンド（React + Vite）
│       ├── .storybook/
│       │   ├── main.ts                 # Storybook 設定
│       │   └── preview.ts              # グローバルパラメータ
│       ├── docker/
│       │   ├── Dockerfile
│       │   ├── Dockerfile.playwright   # Playwright 用 Docker イメージ
│       │   └── docker-compose.yml
│       ├── e2e/
│       │   └── components.visual.ts    # Visual Regression テスト
│       ├── src/
│       │   ├── api/                    # API クライアント層
│       │   ├── components/             # React コンポーネント
│       │   ├── hooks/                  # カスタムフック
│       │   ├── utils/                  # ユーティリティ
│       │   ├── App.tsx                 # メインコンポーネント
│       │   └── main.tsx                # エントリーポイント
│       ├── index.html
│       ├── package.json
│       ├── playwright.config.ts        # Playwright 設定
│       ├── tsconfig.json
│       ├── vite.config.ts
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
├── .firebaserc                          # Firebase プロジェクト設定
├── firebase.json                        # Firebase 設定（Functions + Hosting デプロイ）
├── package.json                        # ルート設定（Git フック・lint-staged）
├── tsconfig.json                       # 共通 TypeScript ベース設定
├── CONTRIBUTING.md                     # 開発ガイド
├── input/                              # 解析対象ファイルを配置
├── logs/                               # 解析結果ログ
└── secrets/                            # サービスアカウントキー（git管理外）
```

## 技術スタック

| Tool                     | Version                            |
| ------------------------ | ---------------------------------- |
| Node.js                  | 22 (Docker イメージ: node:22-slim) |
| TypeScript               | ^5.9                               |
| Vitest                   | ^4.0                               |
| ESLint                   | ^10.0                              |
| Prettier                 | ^3.8                               |
| React                    | ^19.1                              |
| Storybook                | ^10.3 (alpha)                      |
| Playwright               | ^1.52                              |
| Vite                     | ^8.0                               |
| @google-cloud/documentai | ^9.5.0                             |
| @google/genai            | ^2.10                              |
| @anthropic-ai/vertex-sdk | ^0.19                              |
| @anthropic-ai/sdk        | ^0.110                             |
| firebase                 | ^12.11                             |
| firebase-functions       | ^7.3                               |
| firebase-admin           | ^13.4                              |

## 開発に参加する

- 開発規約・ワークフロー → [CONTRIBUTING.md](./CONTRIBUTING.md)
- アーキテクチャ決定記録 → [docs/adr/](./docs/adr/)
- AI駆動開発ガイドライン → [docs/ai-development-guidelines.md](./docs/ai-development-guidelines.md)
