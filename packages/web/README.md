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
npm run storybook -- --host 0.0.0.0  # Storybook 開発サーバー起動（--host 必須）
npm run build:storybook  # Storybook 静的ビルド
npm run test:coverage    # テスト + カバレッジ計測
npm run test:watch       # テスト実行（ウォッチモード）
```

## テスト構成

テストは Vitest のプロジェクト機能で **unit**（単体テスト）と **integration**（結合テスト）に分離しています。

| 種別        | 配置場所                          | 説明                                                     |
| ----------- | --------------------------------- | -------------------------------------------------------- |
| unit        | `src/**/*.test.{ts,tsx}`          | ソースコードと同じディレクトリに配置。依存は個別にモック |
| integration | `tests/integration/**/*.test.tsx` | App を実際の依存グラフで結合して検証。`fetch` のみモック |

結合テストのヘルパー（フィクスチャ・モック）は `tests/integration/helpers/` にまとめています。
Visual Regression テストは Vitest ではなく Playwright で実行し、`e2e/` に置いています。

型検査は `src/` `tests/` `e2e/` `.storybook/` `*.config.ts` が対象です。
ESLint・Prettier は上記に加えて `eslint.config.js` も対象にしています
（`npm run typecheck` は `tsconfig.test.json` を使用）。Vitest は型を検査しないため、
テストコードの型崩れは `typecheck` で検出します。

## ローカル実行

**この Web はローカル実行専用です（ADR-0015）。** Hosting にはデプロイしません。

### 初回のみ: API キーを置く

Web は Functions の onRequest エンドポイントを叩き、これは `FUNCTIONS_API_KEY` による Bearer 認証を要求します。
dev サーバーの proxy が送るキーを `packages/web/.env.local` に置いてください（`VITE_` 接頭辞は付けない）。

**入れる値は「エミュレータが検証に使う値」と一致させる必要があります。** どちらになるかはログイン状態で変わります。

| 状態                  | エミュレータが使う値                                     |
| --------------------- | -------------------------------------------------------- |
| `firebase login` 済み | **Secret Manager の値**（`defineSecret` が取得しに行く） |
| 未ログイン            | `packages/functions/.env.local` の値                     |

ログイン済みの場合、エミュレータの起動ログに `Trying to access secret FUNCTIONS_API_KEY@latest` が出ます。
このとき `packages/functions/.env.local` に別の値が入っていても**無視される**ため、
Secret Manager の値を取得して web 側に入れてください。

```bash
# functions のコンテナ内で値を取得する
npm run docker:functions:sh
firebase functions:secrets:access FUNCTIONS_API_KEY --project dev

# 取得した値を web に置く（VITE_ 接頭辞は付けないこと）
echo 'FUNCTIONS_API_KEY=<値>' >> packages/web/.env.local
```

`.env.local` は `.gitignore` 済みでリポジトリには入りません。雛形は各パッケージの `.env.example` を参照してください。

> キーが食い違うと `{"error":"無効な API キーです。"}`（HTTP 401）が返ります。
> `{"error":"認証が必要です。"}` の場合はヘッダー自体が付いていないので、
> `packages/web/.env.local` の変数名（`VITE_` を付けていないか）を確認してください。

### 起動

```bash
# ターミナル1: Functions 起動
npm run docker:functions:start

# ターミナル2: Web 開発サーバー起動
npm run docker:web:dev
```

ブラウザで http://localhost:5173 にアクセスし、ファイルをアップロードすると OCR 結果が表示されます。

> dev サーバーは `--host` で起動し、compose がホストの全インターフェースに公開するため、
> **同一 LAN の別端末（スマートフォン等）からも開けます**。動作確認のために意図してこの設定にしています。
> proxy が認証ヘッダーを自動で付けるため、LAN から到達できる相手は認証なしで課金 API を呼べます（ADR-0015 の受容リスク）。

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

## 環境変数

Vite の [env ファイル読み込み規約](https://vite.dev/guide/env-and-mode) に従い、モードに応じたファイルが自動ロードされます。

| ファイル       | 用途                               | 読み込みタイミング |
| -------------- | ---------------------------------- | ------------------ |
| `.env`         | 全モード共通の設定                 | 常時               |
| `.env.local`   | 端末ローカルの設定（git 管理外）   | 常時               |
| `.env.example` | 設定項目のリファレンス（git 管理） | —                  |

### 必要な環境変数

| 変数名              | 必須 | 置き場所           | 説明                                                                                    |
| ------------------- | ---- | ------------------ | --------------------------------------------------------------------------------------- |
| `FUNCTIONS_API_KEY` | Yes  | `.env.local`       | onRequest の呼び出し側 API キー。dev サーバーの proxy が Authorization ヘッダーに載せる |
| `API_PROXY_TARGET`  | No   | compose が設定済み | proxy の転送先。未設定なら `http://localhost:8080`                                      |

**`VITE_` 接頭辞を付けないこと。** 付けるとバンドルに焼き込まれ、ブラウザから読めてしまいます。
接頭辞なしの変数は `vite.config.ts` が `loadEnv(mode, webRoot, "")` で明示的に読み込み、
dev サーバー（Node 側）だけが参照します。

### Functions への接続

ブラウザは同一オリジンの `/api/<エンドポイント名>` を叩き、dev サーバーの proxy（`vite.config.ts` の
`server.proxy`）が Functions エミュレータへ転送します。同一オリジンのため、Functions 側に CORS 設定は要りません。

| 項目             | 内容                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| ブラウザ         | `POST /api/parseDocumentGeminiHttp`                                        |
| proxy の書き換え | `/<project>/<region>/parseDocumentGeminiHttp`（エミュレータの URL 形）     |
| 転送先           | `API_PROXY_TARGET`（compose が `http://host.docker.internal:8080` を設定） |
| 付与ヘッダー     | `Authorization: Bearer <FUNCTIONS_API_KEY>`                                |

プロジェクト ID は `.firebaserc` の `projects.default` から読みます。エミュレータは `--project` を
付けずに起動するため、同じ値を参照することで URL のずれを防いでいます。リージョンは
`packages/functions/src/index.ts` の onRequest の指定と揃えてください。

**API キーはバンドルに含まれません。** proxy（Node 側）でヘッダーを付けるため、ブラウザはキーを持ちません。
