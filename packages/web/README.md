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

# コンテナ内で（認証情報は volume に残るため、初回とログアウト後のみ）
firebase login --no-localhost

# 開発環境
firebase deploy --only hosting --project dev

# ステージング環境（プロジェクト作成後に有効）
firebase deploy --only hosting --project staging

# 本番環境（プロジェクト作成後に有効）
firebase deploy --only hosting --project prod
```

| 環境         | エイリアス（`.firebaserc`） | プロジェクト              | 使われる env       | 状態   |
| ------------ | --------------------------- | ------------------------- | ------------------ | ------ |
| 開発         | `dev` / `default`           | `documentaisample-488504` | `.env.development` | 稼働中 |
| ステージング | `staging`                   | 未作成                    | `.env.staging`     | 未作成 |
| 本番         | `prod`                      | 未作成                    | `.env.production`  | 未作成 |

`firebase login` の認証情報は named volume `firebase_config`（コンテナ内の `/home/node/.config`）に保存されます。
コンテナを終了しても残るため、ログインは一度で済みます。ログインを解除するには `firebase logout` を実行してください。
volume は web / functions で別々なので、functions 側でも一度ログインが必要です。

staging / prod はプロジェクトを作成するまで `.firebaserc` にエイリアスが無いため、
指定してもエラーになります。作成手順は下記「デプロイ先を追加する」を参照してください。

対応の定義は `scripts/deploy-guard.mjs` の `DEPLOY_MODES` が唯一の正です。
Firebase CLI が predeploy フックに渡す `GCLOUD_PROJECT`（エイリアス解決後のプロジェクト ID）から mode を引きます。

次の場合はビルドが失敗し、デプロイは中止されます。

- `DEPLOY_MODES` に無いプロジェクトへデプロイしようとした
- 必須の `VITE_FIREBASE_*` / `VITE_APP_PASSWORD` が未設定、または `.env.example` の雛形値（`your-...`）のまま
- `VITE_FIREBASE_PROJECT_ID` がデプロイ先プロジェクトと一致しない

> 誤った Firebase 設定が焼き込まれると、Functions の呼び出し先が存在しないホストになり、
> ブラウザ上は CORS エラーとして現れます。上記のチェックはこれを防ぐためのものです。

> `VITE_APP_PASSWORD` は UI の目隠しです。値はバンドルに含まれるため、
> Functions 側の保護ではありません。

### デプロイ先を追加する

staging / 本番のプロジェクトを作成したときの手順です（web / functions 両方を含みます）。
以下は本番（mode=production・エイリアス `prod`）の例です。

1. Firebase プロジェクトを作成する
2. `.firebaserc` にエイリアスを追加する

   ```json
   {
     "projects": {
       "default": "documentaisample-488504",
       "dev": "documentaisample-488504",
       "prod": "<project-id>"
     }
   }
   ```

   `default` は消さないこと。`packages/functions` の `firebase emulators:start` /
   `functions:shell` は `--project` を付けていないため、アクティブプロジェクトが無くなると
   `npm run docker:functions:start` が失敗します。

3. `packages/web/.env.production` を作成し、実際の値を設定する（`.env.example` 参照）
4. `scripts/deploy-guard.mjs` の `DEPLOY_MODES` のコメントを外して ID を入れる

   ```js
   "<project-id>": "production",
   ```

5. `packages/functions/.env.<project-id>` を作成する（`packages/functions/.env.example` 参照）
6. Secret Manager に `FUNCTIONS_API_KEY` / `ANTHROPIC_API_KEY` を登録する
   （`packages/functions/README.md` の「シークレットの設定」）
7. Document AI プロセッサを作成し、Vertex AI を有効化する

3・4 のどちらかを忘れると web のビルドが失敗して止まります。
一方 5・6・7（functions 側）の漏れはガードの対象外で、web は正常に公開され、
UI からのリクエストが実行時にエラーになる形で現れます。

ガードは `.env` / `.env.local`（端末ローカル・git 管理外）も読むため、
端末側にだけ値がある状態でも通ります。`.env.<mode>` に入っていることを確認してください。

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

| 変数名                              | 必須           | 説明                                                                                        |
| ----------------------------------- | -------------- | ------------------------------------------------------------------------------------------- |
| `VITE_FIREBASE_API_KEY`             | Yes            | Firebase API キー                                                                           |
| `VITE_FIREBASE_AUTH_DOMAIN`         | Yes            | Firebase Auth ドメイン                                                                      |
| `VITE_FIREBASE_PROJECT_ID`          | Yes            | Firebase プロジェクト ID                                                                    |
| `VITE_FIREBASE_STORAGE_BUCKET`      | Yes            | Firebase Storage バケット                                                                   |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Yes            | Firebase Messaging Sender ID                                                                |
| `VITE_FIREBASE_APP_ID`              | Yes            | Firebase App ID                                                                             |
| `VITE_APP_PASSWORD`                 | デプロイ時のみ | UI アクセス制限用パスワード。値はバンドルに含まれるため UI の目隠し。`npm run dev` では不要 |

### Functions エミュレータ接続

エミュレータ接続は Vite の `command` パラメータで自動判定されます（`vite.config.ts` の `define` で `__USE_EMULATOR__` を設定）。開発サーバー（`vite`）実行時のみエミュレータに接続し、ビルド（`vite build`）では mode に関係なく接続しません。

| シナリオ                         | Vite command | エミュレータ |
| -------------------------------- | ------------ | ------------ |
| ローカル開発（`docker:web:dev`） | serve        | 接続する     |
| ビルド（全 mode 共通）           | build        | 接続しない   |
