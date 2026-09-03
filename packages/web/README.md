# @docai/web

React + Vite による Web フロントエンドです。ファイルをアップロードし、抽出エンジン（Document AI / Gemini / Claude）を選択すると、Functions API 経由で OCR 結果を表示します。選択したファイルは解析前にサムネイルでプレビューされ、画像はクリックで拡大表示して内容を目視確認できます（PDF はアイコン表示）。

## 開発コマンド

`check`（コミット前）と `verify`（デプロイ前）の使い分けは
[ルート README の「検査コマンドの使い分け」](../../README.md#検査コマンドの使い分け)を参照してください。

デプロイ前の完全な検査には、Storybook ビルドと VRT まで含む
`npm run docker:verify`（ルートで実行）を使ってください。

```bash
npm run docker:web:verify              # web の検査（読み取り専用・VRT は含まない）
npm run docker:web:check               # コミット前チェック（lint:fix→typecheck→test）
npm run docker:web:lint                # ESLint 実行
npm run docker:web:lint:fix            # ESLint 自動修正
npm run docker:web:format:check        # Prettier チェック
npm run docker:web:format              # Prettier フォーマット
npm run docker:web:typecheck           # 型検査（テスト・e2e・Storybook・設定ファイルを含む）
npm run docker:web:build               # Vite プロダクションビルド
npm run docker:web:test                # テスト実行（全テスト）
npm run docker:web:test:integration    # 結合テストのみ実行
npm run docker:web:test:scripts        # ビルドスクリプトのテストのみ実行
npm run docker:web:test:coverage       # テスト + カバレッジ計測
npm run docker:web:dev                 # 開発サーバー起動
npm run docker:web:sh                  # コンテナに入って操作
npm run docker:web:storybook           # Storybook 開発サーバー起動（localhost:6006）
npm run docker:web:build:storybook     # Storybook 静的ビルド
npm run docker:web:test:visual         # Visual Regression テスト実行
npm run docker:web:test:visual:update  # ベースラインスクリーンショット更新
```

### コンテナ内での操作

```bash
npm run docker:web:sh
# コンテナ内で
npm run check            # コミット前チェック（lint:fix→typecheck→test）
npm run verify           # web の検査（読み取り専用・VRT は含まない）
npm run typecheck        # 型検査（テスト・e2e・Storybook・設定ファイルを含む）
npm run build            # TypeScript + Vite ビルド
npm run dev -- --host    # 開発サーバー起動（--host 必須）
npm run lint:fix         # ESLint 自動修正
npm run format           # Prettier フォーマット
npm run test             # テスト実行（全テスト）
npm run test:unit        # ユニットテストのみ
npm run test:integration # 結合テストのみ
npm run test:scripts     # ビルドスクリプトのテストのみ
npm run storybook -- --host 0.0.0.0  # Storybook 開発サーバー起動（--host 必須）
npm run build:storybook  # Storybook 静的ビルド
npm run test:coverage    # テスト + カバレッジ計測
npm run test:watch       # テスト実行（ウォッチモード）
```

## テスト構成

テストは Vitest のプロジェクト機能で **unit**（単体テスト）、**integration**（結合テスト）、**scripts**（ビルドスクリプト）に分離しています。

| 種別        | 配置場所                          | 説明                                                          |
| ----------- | --------------------------------- | ------------------------------------------------------------- |
| unit        | `src/**/*.test.{ts,tsx}`          | ソースコードと同じディレクトリに配置。依存は個別にモック      |
| integration | `tests/integration/**/*.test.tsx` | App を実際の依存グラフで結合して検証。Firebase SDK のみモック |
| scripts     | `tests/scripts/**/*.test.ts`      | デプロイガード（`scripts/deploy-guard.mjs`）の判定ロジック    |

結合テストのヘルパー（フィクスチャ・モック）は `tests/integration/helpers/` にまとめています。
Visual Regression テストは Vitest ではなく Playwright で実行し、`e2e/` に置いています。

型検査は `src/` `tests/` `e2e/` `.storybook/` `*.config.ts` が対象です。
`scripts/*.mjs` は `allowJs` で読み込むだけで（`checkJs` は付けていない）型検査の対象外です。
ESLint・Prettier は上記に加えて `scripts/` と `eslint.config.js` も対象にしています
（`npm run typecheck` は `tsconfig.test.json` を使用）。Vitest は型を検査しないため、
テストコードの型崩れは `typecheck` で検出します。

## ローカル実行

Functions を起動した状態で、別ターミナルから Web 開発サーバーを起動します。

```bash
# ターミナル1: Functions 起動
npm run docker:functions:start

# ターミナル2: Web 開発サーバー起動
npm run docker:web:dev
```

ブラウザで http://localhost:5173 にアクセスし、ファイルをアップロードすると OCR 結果が表示されます。

## Storybook

```bash
npm run docker:web:storybook
```

ブラウザで http://localhost:6006 にアクセスすると、各コンポーネントの状態バリエーションを一覧できます。

## Visual Regression テスト

コンポーネントの見た目が意図せず変わっていないかをスクリーンショット比較で検証します。

```bash
# 1. Storybook を静的ビルド
npm run docker:web:build:storybook

# 2. ベースラインとの差分チェック
npm run docker:web:test:visual
```

コンポーネントの見た目を意図的に変更した場合は、ベースラインスクリーンショットを更新します。

```bash
# 1. Storybook を静的ビルド
npm run docker:web:build:storybook

# 2. ベースラインを撮り直す
npm run docker:web:test:visual:update

# 3. 更新された PNG を git にコミット
git add packages/web/e2e/components.visual.ts-snapshots/
```

CI では Storybook ビルド → Playwright テストが自動実行され、ベースラインとの差分があれば失敗します。

## デプロイ

`firebase deploy` の `predeploy` フックで自動ビルドされます。ビルドに使う mode（= 読み込む `.env.<mode>`）は
**デプロイ先の Firebase プロジェクトから自動で決まる**ため、環境変数を手で指定する必要はありません。

```bash
npm run docker:web:sh

# コンテナ内で
firebase login --no-localhost  # 初回のみ

# 開発環境
firebase deploy --only hosting --project dev
```

| デプロイ先プロジェクト    | エイリアス（`.firebaserc`） | 使われる env       |
| ------------------------- | --------------------------- | ------------------ |
| `documentaisample-488504` | `dev` / `default`           | `.env.development` |

対応の定義は `scripts/deploy-guard.mjs` の `DEPLOY_MODES` が唯一の正です。
Firebase CLI が predeploy フックに渡す `GCLOUD_PROJECT`（エイリアス解決後のプロジェクト ID）から mode を引きます。

次の場合はビルドが失敗し、デプロイは中止されます。

- `DEPLOY_MODES` に無いプロジェクトへデプロイしようとした
- 必須の `VITE_FIREBASE_*` が未設定、または `.env.example` の雛形値（`your-...`）のまま

> 誤った Firebase 設定が焼き込まれると、Functions の呼び出し先が存在しないホストになり、
> ブラウザ上は CORS エラーとして現れます。上記のチェックはこれを防ぐためのものです。

### デプロイ先を追加する（例: 本番環境）

1. Firebase プロジェクトを作成する
2. `.firebaserc` にエイリアスを追加する（例: `"prod": "<project-id>"`）
3. `packages/web/.env.production` に実際の値を設定する（`.env.example` 参照）
   - `VITE_APP_PASSWORD` も設定する。未設定だと `PasswordGate` が外れ、
     誰でも UI から課金対象の Functions を呼べる状態で公開される（`src/App.tsx`）
4. `scripts/deploy-guard.mjs` の `DEPLOY_MODES` に `"<project-id>": "production"` を追加する
5. Functions 側は `packages/functions/.env.<project-id>` と Secret Manager への登録が別途必要（`packages/functions/README.md` 参照）

複数のデプロイ先ができたら、`.firebaserc` の `default` を外して `--project` を必須にすると、
指定漏れによる誤デプロイを防げます。

> `firebase deploy` の predeploy フックはビルドと上記の設定チェックのみで、lint・型検査・テスト・VRT は行いません。
> デプロイ前に `npm run docker:verify`（ホスト側）を通してください。

デプロイ後、`https://<project-id>.web.app` で Web フロントエンドにアクセスできます。
Functions の呼び出しは Firebase SDK の `httpsCallable` で直接行うため、Hosting 側の API プロキシ設定は不要です。

## 環境変数

Vite の [env ファイル読み込み規約](https://vite.dev/guide/env-and-mode) に従い、モードに応じたファイルが自動ロードされます。

| ファイル           | 用途                                            | 読み込みタイミング                             |
| ------------------ | ----------------------------------------------- | ---------------------------------------------- |
| `.env`             | 全モード共通の設定                              | 常時                                           |
| `.env.development` | 開発環境（Firebase 設定・パスワード等）         | `npm run dev` / `dev` プロジェクトへのデプロイ |
| `.env.staging`     | ステージング環境（Firebase 設定・パスワード等） | staging のデプロイ先を追加した場合             |
| `.env.production`  | 本番環境（Firebase 設定・パスワード等）         | 本番のデプロイ先を追加した場合                 |
| `.env.example`     | 設定項目のリファレンス（git 管理）              | —                                              |

### 必要な環境変数

環境固有のファイル（`.env.development` 等）に設定します。

| 変数名                              | 必須 | 説明                                            |
| ----------------------------------- | ---- | ----------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Yes  | Firebase API キー                               |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Yes  | Firebase Auth ドメイン                          |
| `VITE_FIREBASE_PROJECT_ID`          | Yes  | Firebase プロジェクト ID                        |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Yes  | Firebase Storage バケット                       |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes  | Firebase Messaging Sender ID                    |
| `VITE_FIREBASE_APP_ID`              | Yes  | Firebase App ID                                 |
| `VITE_APP_PASSWORD`                 | No   | UI アクセス制限用パスワード（未設定でスキップ） |

### Functions エミュレータ接続

エミュレータ接続は Vite の `command` パラメータで自動判定されます（`vite.config.ts` の `define` で `__USE_EMULATOR__` を設定）。開発サーバー（`vite`）実行時のみエミュレータに接続し、ビルド（`vite build`）では mode に関係なく接続しません。

| シナリオ                         | Vite command | エミュレータ |
| -------------------------------- | ------------ | ------------ |
| ローカル開発（`docker:web:dev`） | serve        | 接続する     |
| ビルド（全 mode 共通）           | build        | 接続しない   |
