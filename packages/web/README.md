# @docai/web

React + Vite による Web フロントエンドです。ファイルをアップロードすると Functions API 経由で OCR 結果を表示します。

## 開発コマンド

```bash
npm run docker:web:lint                # ESLint 実行
npm run docker:web:format:check        # Prettier チェック
npm run docker:web:test                # テスト実行
npm run docker:web:test:coverage       # テスト + カバレッジ計測
npm run docker:web:dev                 # 開発サーバー起動
npm run docker:web:sh                  # コンテナに入って操作
npm run docker:web:build               # Vite プロダクションビルド
npm run docker:web:storybook           # Storybook 開発サーバー起動（localhost:6006）
npm run docker:web:build:storybook     # Storybook 静的ビルド
npm run docker:web:test:visual         # Visual Regression テスト実行
npm run docker:web:test:visual:update  # ベースラインスクリーンショット更新
```

### コンテナ内での操作

```bash
npm run docker:web:sh
# コンテナ内で
npm run build -w @docai/web            # TypeScript + Vite ビルド
npm run dev -w @docai/web -- --host    # 開発サーバー起動（--host 必須）
npm run lint:fix -w @docai/web         # ESLint 自動修正
npm run format -w @docai/web           # Prettier フォーマット
npm run test:unit -w @docai/web        # ユニットテストのみ
npm run storybook -w @docai/web -- --host 0.0.0.0  # Storybook 開発サーバー起動（--host 必須）
npm run build:storybook -w @docai/web  # Storybook 静的ビルド
npm run test:coverage -w @docai/web    # テスト + カバレッジ計測
npm run test:watch -w @docai/web       # テスト実行（ウォッチモード）
```

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

`firebase deploy` の `predeploy` フックで `npm run build` が自動実行されます。デフォルトでは mode=production でビルドされるため、開発・ステージング環境にデプロイする場合は事前に対象モードでビルドしてください。

```bash
npm run docker:web:sh

# コンテナ内で
firebase login --no-localhost  # 初回のみ

# 本番環境（デフォルト: mode=production）
firebase deploy --only hosting --project <project-id>

# 開発・ステージング環境の場合は、先にモードを指定してビルド
npm run build -w @docai/web -- --mode development  # or staging
firebase deploy --only hosting --project <project-id>
```

デプロイ後、`https://<project-id>.web.app` で Web フロントエンドにアクセスできます。
Functions の呼び出しは Firebase SDK の `httpsCallable` で直接行うため、Hosting 側の API プロキシ設定は不要です。

## 環境変数

Vite の [env ファイル読み込み規約](https://vite.dev/guide/env-and-mode) に従い、モードに応じたファイルが自動ロードされます。

| ファイル           | 用途                                            | 読み込みタイミング                                    |
| ------------------ | ----------------------------------------------- | ----------------------------------------------------- |
| `.env`             | 全モード共通の設定                              | 常時                                                  |
| `.env.development` | 開発環境（Firebase 設定・パスワード等）         | `npm run dev` / `npm run build -- --mode development` |
| `.env.staging`     | ステージング環境（Firebase 設定・パスワード等） | `npm run build -- --mode staging`                     |
| `.env.production`  | 本番環境（Firebase 設定・パスワード等）         | `npm run build`（mode=production）                    |
| `.env.example`     | 設定項目のリファレンス（git 管理）              | —                                                     |

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

エミュレータ接続は環境変数 `VITE_USE_EMULATOR` で制御します。この変数は `.env` ファイルには設定せず、`docker-compose.yml` の `environment` でローカル開発時のみ注入されます。

| シナリオ                                 | `VITE_USE_EMULATOR`        | エミュレータ |
| ---------------------------------------- | -------------------------- | ------------ |
| ローカル開発（`docker:web:dev`）         | `"true"`（docker-compose） | 接続する     |
| 開発環境デプロイ（`--mode development`） | 未設定                     | 接続しない   |
| STG 環境デプロイ（`--mode staging`）     | 未設定                     | 接続しない   |
| 本番デプロイ（`--mode production`）      | 未設定                     | 接続しない   |
