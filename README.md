# OCR Sample

Google Cloud Document AI を使用してレシート等の画像・PDF から情報を抽出する OCR ツールです。
Docker 上で動作します。

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
docker-compose -f docker/docker-compose.yml build

# 本番環境
docker-compose -f docker/docker-compose.prod.yml build
```

### コンテナに入って操作する

```bash
docker-compose -f docker/docker-compose.yml run --rm ocr bash
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
docker-compose -f docker/docker-compose.yml up --build

# 本番環境
docker-compose -f docker/docker-compose.prod.yml up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。

## アーキテクチャ

DDD（ドメイン駆動設計）に基づく 3 層構成を採用しています。

| レイヤー               | ディレクトリ          | 責務                                                         |
| ---------------------- | --------------------- | ------------------------------------------------------------ |
| **ドメイン層**         | `src/domain/`         | 純粋なビジネスロジック（外部依存なし）                       |
| **アプリケーション層** | `src/application/`    | ユースケースの実行。インターフェースを通じてインフラ層に依存 |
| **インフラ層**         | `src/infrastructure/` | 外部サービス連携（GCP Document AI・ファイル I/O・環境変数）  |

エントリーポイント（`src/index.ts`）は依存注入のワイヤリングのみを行い、具体的なロジックは持ちません。

## Docker 構成

| ファイル                         | 用途     | 説明                                   |
| -------------------------------- | -------- | -------------------------------------- |
| `docker/Dockerfile`              | 開発環境 | 全依存インストール + TypeScript ビルド |
| `docker/Dockerfile.prod`         | 本番環境 | マルチステージビルドで本番依存のみ含む |
| `docker/docker-compose.yml`      | 開発環境 | `Dockerfile` を使用                    |
| `docker/docker-compose.prod.yml` | 本番環境 | `Dockerfile.prod` を使用               |

## ディレクトリ構成

```
.
├── docker/
│   ├── Dockerfile              # 開発環境用
│   ├── Dockerfile.prod         # 本番環境用
│   ├── docker-compose.yml      # 開発環境用
│   └── docker-compose.prod.yml # 本番環境用
├── src/
│   ├── domain/                 # ドメイン層
│   │   ├── mime-type.ts
│   │   └── mime-type.test.ts
│   ├── application/            # アプリケーション層
│   │   ├── process-document.ts
│   │   └── process-document.test.ts
│   ├── infrastructure/         # インフラ層
│   │   ├── config.ts
│   │   ├── config.test.ts
│   │   ├── file-reader.ts
│   │   ├── file-reader.test.ts
│   │   ├── document-ai-client.ts
│   │   └── document-ai-client.test.ts
│   ├── index.ts                # エントリーポイント（依存注入）
│   └── index.test.ts
├── tests/
│   ├── helpers/                # 共有テストユーティリティ
│   └── integration/            # 統合テスト
├── tsconfig.json               # ビルド用
├── tsconfig.test.json          # テスト用（IDE型チェック）
├── vitest.config.ts
├── package.json
├── input/                      # 解析対象ファイルを配置
├── logs/                       # 解析結果ログ
└── secrets/                    # サービスアカウントキー（git管理外）
```

## 技術スタック

| Tool                     | Version                            |
| ------------------------ | ---------------------------------- |
| Node.js                  | 20 (Docker イメージ: node:20-slim) |
| TypeScript               | ^5.9                               |
| Vitest                   | ^4.0                               |
| ESLint                   | ^10.0                              |
| Prettier                 | ^3.8                               |
| @google-cloud/documentai | ^8.0.0                             |

## 設定ファイル

### TypeScript (`tsconfig.json`)

- target: ES2022 / module: NodeNext / strict: true
- outDir: `dist` / rootDir: `src`
- ビルド時はテストファイル（`src/**/*.test.ts`）を除外
- テスト用は `tsconfig.test.json`（noEmit: true、`src` + `tests` を含む）

### Vitest (`vitest.config.ts`)

- projects で unit（`src/**/*.test.ts`）と integration（`tests/integration/**/*.test.ts`）を分離

### ESLint (`eslint.config.js`)

- Flat Config 形式
- `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-config-prettier`
- `dist/` を ignores

### Prettier (`.prettierrc`)

- semi: true / singleQuote: false / tabWidth: 2 / trailingComma: all / printWidth: 100

### `.gitignore`

- 除外対象: `.DS_Store`, `.env`, `.idea/`, `node_modules`, `dist`, `tasks`, `secrets`, `input`, `logs`

## 開発手法

### TDD（テスト駆動開発）

実装は以下のサイクルで進めます。

1. **Red**: 先にテストを書き、失敗することを確認する
2. **Green**: テストが通る最小限の実装を行う
3. **Refactor**: コードを整理する（テストが通ることを維持）

### DDD（ドメイン駆動設計）

- ドメインロジックをインフラ層（外部 API・ファイル I/O・環境変数等）から分離する
- ドメイン層は純粋な関数・クラスで構成し、外部依存を持たない
- インフラ層の依存はインターフェース（型）を通じて注入する

## 規約

- ES Modules（`import` を使用、`require` は不可）
- Node.js 20（Docker イメージ: `node:20-slim`）
- `.env` は git 管理外。共有設定は `.env.example` で管理する

## コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/ja/) に従います。

```
<type>(<scope>): <summary>（50文字以内・日本語）
```

### type 一覧

| type       | 用途               |
| ---------- | ------------------ |
| `feat`     | 新機能             |
| `fix`      | バグ修正           |
| `refactor` | リファクタリング   |
| `docs`     | ドキュメント       |
| `chore`    | 設定・依存関係など |
| `test`     | テストの追加・修正 |

### ルール

- 日本語で記述する
- 1 コミット 1 作業に分ける

## ブランチ命名規則

`<type>/#<issue番号>-<説明>` の形式で作成します。

### type 一覧

- `feature` — 新機能
- `fix` — バグ修正
- `refactor` — リファクタリング
- `docs` — ドキュメント
- `chore` — 設定・依存関係など

### 例

- `feature/#3-typescript-migration`
- `fix/#12-login-error`
- `docs/#5-update-readme`

## タスク管理フロー

1. GitHub Issue を作成する
2. `git pull origin main` で main を最新化する
3. ブランチ命名規則に従い作業ブランチを作成する
4. `tasks/todo-#<issue番号>.md` に計画を記録する
5. 実装・進捗を随時記録する
6. `tasks/todo-#<issue番号>.md` にレビューセクションを追記する
7. プロジェクト構成に影響する変更時は README.md も更新する

## PR ルール

- **マージ戦略**: Squash and merge
- **レビュー**: 1 人以上の承認が必要
- **CI**: 全ジョブがパスしていることが必須

## CI

GitHub Actions（`.github/workflows/ci.yml`）で以下を自動実行します。

- `npm run lint` — ESLint
- `npm run format:check` — Prettier
- `npm run build` — TypeScript ビルド
- `npm run test` — テスト

すべてのジョブがパスしていることが PR マージの必須条件です。

## テスト方針

- **ユニットテスト**: 対象ファイルと同階層にコロケーション（`*.test.ts`）
- **統合テスト**: `tests/integration/` に配置
