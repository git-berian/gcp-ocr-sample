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

```bash
npm run docker:web:sh

# コンテナ内で
firebase login --no-localhost  # 初回のみ
firebase deploy --only hosting --project <project-id>
```

デプロイ後、`https://<project-id>.web.app` で Web フロントエンドにアクセスできます。
`/api/**` へのリクエストは Firebase Hosting の rewrites により、Cloud Run（Functions Gen2）に自動転送されます。
