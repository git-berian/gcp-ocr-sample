# 開発ガイド

このプロジェクトの開発規約・ワークフローをまとめたドキュメントです。

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

<本文（任意）>

関連: #<issue番号>
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
- 本文は任意。必要に応じて変更の補足を自由記述で書く
- 詳細な変更内容・変更理由・影響範囲は PR に記載する（Squash merge 運用）

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
- `npm run test:coverage` — テスト + カバレッジ計測

ルートの workspaces スクリプトを通じて各パッケージのコマンドが実行されます。
すべてのジョブがパスしていることが PR マージの必須条件です。

## Dependabot

Dependabot（`.github/dependabot.yml`）で依存パッケージを自動監視しています。

| 対象           | ディレクトリ    | 頻度   |
| -------------- | --------------- | ------ |
| npm            | `packages/api/` | weekly |
| GitHub Actions | `/`             | weekly |

## テスト方針

- **ユニットテスト**: 対象ファイルと同階層にコロケーション（`*.test.ts`）
- **統合テスト**: `tests/integration/` に配置

## 設定ファイル

### TypeScript

- ルートの `tsconfig.json` に共通設定（target, module, strict 等）を定義
- 各パッケージの `tsconfig.json` で extends して outDir / rootDir を指定
- テスト用は `tsconfig.test.json`（noEmit: true、`src` + `tests` を含む）

### Vitest (`packages/api/vitest.config.ts`)

- projects で unit（`src/**/*.test.ts`）と integration（`tests/integration/**/*.test.ts`）を分離

### ESLint (`packages/api/eslint.config.js`)

- Flat Config 形式
- `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-config-prettier`
- `dist/` を ignores

### Prettier (`.prettierrc`)

- semi: true / singleQuote: false / tabWidth: 2 / trailingComma: all / printWidth: 100

### `.gitignore`

- 除外対象: `.DS_Store`, `.env`, `.idea/`, `.claude/settings.local.json`, `node_modules`, `dist`, `tasks`, `secrets`, `input`, `logs`
