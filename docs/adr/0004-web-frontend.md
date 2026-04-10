# ADR-0004: Web フロントエンドパッケージの新設

## ステータス

承認

## コンテキスト

`packages/functions`（Cloud Functions HTTP API）が追加され、画像アップロード → OCR 結果取得の API が利用可能になった。次のステップとして、この API を利用するフロントエンドが必要になった。

要件:

- 画像ファイルをアップロードして OCR 結果をテーブル表示する SPA
- Firebase SDK の `httpsCallable` で Functions（onCall）を呼び出す
- デザインは後から変更予定のためスタイリングは最小限

## 決定

### 技術選定: React + Vite

- **React**: コンポーネントベースの UI 構築に適している
- **Vite**: 高速 HMR、ESM ネイティブでモノレポの `"type": "module"` と整合

### パッケージ構成

- `@docai/web` として `packages/web/` に配置
- `@docai/functions` のコードには依存しない（Firebase SDK の `httpsCallable` 経由で onCall プロトコルを境界とする）
- 型定義は web 側で独自に持つ

### API クライアント設計

- `src/api/firebase.ts`: Firebase App + Functions の初期化（環境変数 `VITE_FIREBASE_*` を使用）
- `src/api/parse-document.ts`: `httpsCallable` で Functions（onCall）を呼び出し
- ローカル開発時は `connectFunctionsEmulator` でエミュレータに接続（Vite の dev サーバー実行時のみ自動有効化）
- 環境変数は Vite の `.env.{mode}` ファイルで環境ごとに管理（`.env.development` / `.env.staging` / `.env.production`）

## 理由

### Next.js を採用しない理由

- SSR やファイルベースルーティングは現時点で不要
- Vite の方が軽量で高速。ルーティングが必要になれば `react-router` で対応可能

### Functions パッケージに依存しない理由

- `@docai/functions` のコードに依存すると、デプロイサイクルが結合する
- onCall プロトコル（リクエスト/レスポンスの型）を境界とすることで、フロントエンドとバックエンドを独立して開発・デプロイできる

## 影響

- モノレポに 3 つ目のパッケージが追加される
- CI matrix に `@docai/web` が追加され、ビルド時間が若干増加する
- `packages/web` 用の Docker 設定が追加される
