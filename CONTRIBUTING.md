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
- Node.js 22（Docker イメージ: `node:22-slim`）
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

各パッケージ（`functions`, `web`）に対して matrix で並列実行:

- `npm run lint` — ESLint
- `npm run format:check` — Prettier
- `npm run build` — TypeScript / Vite ビルド
- `npm run test:coverage` — テスト + カバレッジ計測

共通ジョブ:

- `visual-regression` — Storybook ビルド + Playwright による Visual Regression テスト
- `commitlint` — コミットメッセージの規約チェック（PR のみ）
- PR サイズ警告 — 500 行超の場合に警告（PR のみ）

すべてのジョブがパスしていることが PR マージの必須条件です。

## Dependabot

Dependabot（`.github/dependabot.yml`）で依存パッケージの **security update のみ**を監視しています。
全エントリに `open-pull-requests-limit: 0` を指定しているため、通常の version update PR は
作成されません（#203）。major を含む通常の更新は「依存パッケージの更新」の手順で手動対応します。

| 対象           | ディレクトリ          | 頻度   |
| -------------- | --------------------- | ------ |
| npm            | `/`                   | weekly |
| npm            | `packages/functions/` | weekly |
| npm            | `packages/web/`       | weekly |
| GitHub Actions | `/`                   | weekly |

## 依存パッケージの更新

上記のとおり Dependabot からは通常の更新 PR が来ないため、手動で判断します。

### 手順

1. `npm view <package> dist-tags` でその時点の最新版を確認する（Dependabot PR や Issue に書かれた
   版数は「書かれた時点」のスナップショットなので鵜呑みにしない）
2. `grep -n '"<package>"' package.json packages/*/package.json` で対象箇所を洗い出す
   （同じ依存が root と各パッケージの両方にあることがある）
3. 対象の `package.json` を書き換える
4. lock を Docker 経由で再生成する（下記）
5. lock の差分内訳を確認し、意図しない間接依存の推移が混ざっていないか見る
6. Docker 経由で lint / format:check / build / test:coverage を実行する。web は VRT も実行する（下記）
7. ホスト側の `node_modules` を追従させる（下記）
8. root の依存を変更した場合は、git hook と commitlint の動作も確認する（下記）
9. 版数を記載しているドキュメント（README.md の技術スタック表等）を更新する

### lock の再生成（Docker）

lock は Docker 内で生成したものを正とします。ローカルの Node / npm バージョンに成果物を
依存させないためです。

```bash
# packages/functions
docker-compose -f packages/functions/docker/docker-compose.yml run --rm functions \
  npm install --ignore-scripts

# packages/web
docker-compose -f packages/web/docker/docker-compose.yml run --rm web \
  npm install --ignore-scripts

# root（専用の docker script がないため /app を作業ディレクトリにする）
docker-compose -f packages/functions/docker/docker-compose.yml run --rm --workdir /app functions \
  npm install --package-lock-only --ignore-scripts
```

root だけ `--package-lock-only` を付けます。compose の `root_node_modules` volume は
ホストの `node_modules`（macOS ビルドのバイナリを含む）をコンテナから隠すための**空のマスク**であり、
実体を入れる用途ではありません（entrypoint が chown していないため実体を入れようとすると EACCES になります）。
root の devDeps（husky / commitlint / lint-staged 等）はホストの git hook と CI ランナーで動くもので、
Docker 内では使いません。

### ホスト側 node_modules

ホストの `node_modules` は **WebStorm の型解決・補完のため**に置いています。
成果物には使いませんが、依存を更新したら追従させます。

| 目的                        | 実行場所 | コマンド                        |
| --------------------------- | -------- | ------------------------------- |
| lock の生成・更新（正）     | Docker   | 上記の `npm install`            |
| 検証（lint / build / test） | Docker   | `npm run docker:<pkg>:*`        |
| WebStorm の型解決           | ホスト   | `npm ci`（root と各パッケージ） |

ホストで `npm install` を実行すると、ローカルの npm バージョン次第で `package-lock.json` を
書き換えてしまいます。ホストは `npm ci` で lock に追従するだけの役割に徹し、実行後は
`git status` で lock に差分が出ていないことを確認してください。

### VRT の確認（web）

web の依存を更新したら VRT を実行します。**スナップショットを更新する場合も、必ず Storybook の
ビルドから行ってください。**

```bash
npm run docker:web:build:storybook
npm run docker:web:test:visual        # 比較
npm run docker:web:test:visual:update # 差分が正当だと確認できた場合のみ
```

`storybook-static` は named volume 内にあり、ソースを変更しただけでは再ビルドされません。
ビルドを飛ばして `test:visual:update` を単独実行すると、古い成果物に対してスナップショットが
記録され、退行を取り込んだまま緑になります。差分が出たら、まず画像を目視して原因を確認してください。

### root の依存を変更した場合

root の devDeps（`@commitlint/cli` / `husky` / `lint-staged` / `eslint` / `prettier` / `typescript`）は
Docker では使わず、**ホストの git hook と CI の `commitlint` ジョブ**が使います。
`docker:<pkg>:*` の検証では壊れても気づけないため、別途確認します。

```bash
npm ci                                        # ホスト側（前述のとおり npm install は使わない）
npx commitlint --from origin/main --to HEAD   # CI の commitlint ジョブと同等
```

lint-staged / husky はコミット時のフックで実行されるため、実際にコミットして動作を確認します。

## ADR（Architecture Decision Records）

アーキテクチャに関する重要な決定は `docs/adr/` に記録します。
新規作成時は `docs/adr/0000-template.md` をテンプレートとして使用してください。

## テスト方針

- **ユニットテスト**: 対象ファイルと同階層にコロケーション（`*.test.ts`）
- **統合テスト**: `tests/integration/` に配置
- **Visual Regression テスト**: `packages/web/e2e/` に配置。Storybook の各 Story をスクリーンショット比較

## 設定ファイル

### TypeScript

- ルートの `tsconfig.json` に共通設定（target, module, strict 等）を定義
- 各パッケージの `tsconfig.json` で extends して outDir / rootDir を指定
- テスト用は `tsconfig.test.json`（noEmit: true、`src` + `tests` を含む）— 現状 `packages/functions` のみ

### Vitest (`packages/functions/vitest.config.ts`, `packages/web/vitest.config.ts`)

- projects で unit（`src/**/*.test.ts`）と integration（`tests/integration/**/*.test.ts`）を分離

### ESLint (`packages/functions/eslint.config.js`, `packages/web/eslint.config.js`)

- Flat Config 形式
- `@eslint/js` recommended + `typescript-eslint` recommended + `eslint-config-prettier`
- `dist/` を ignores

### Prettier (`.prettierrc`)

- semi: true / singleQuote: false / tabWidth: 2 / trailingComma: all / printWidth: 100

### `.gitignore`

- 除外対象: `.DS_Store`, `.env`, `.env.*`, `.idea/`, `.claude/settings.local.json`, `node_modules`, `dist`, `storybook-static`, `playwright-report`, `test-results`, `tasks`, `secrets`, `input`, `logs`, `.firebase`
