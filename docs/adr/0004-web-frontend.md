# ADR-0004: Web フロントエンドパッケージの新設

## ステータス

承認

## コンテキスト

`packages/functions`（Cloud Functions HTTP API）が追加され、画像アップロード → OCR 結果取得の API が利用可能になった。次のステップとして、この API を利用するフロントエンドが必要になった。

要件:

- 画像ファイルをアップロードして OCR 結果をテーブル表示する SPA
- 将来エンドポイントが増える想定で API クライアントは拡張可能に設計
- デザインは後から変更予定のためスタイリングは最小限

## 決定

### 技術選定: React + Vite

- **React**: コンポーネントベースの UI 構築に適している
- **Vite**: 高速 HMR、ESM ネイティブでモノレポの `"type": "module"` と整合

### パッケージ構成

- `@docai/web` として `packages/web/` に配置
- `@docai/functions` への npm 依存は持たない（HTTP 通信のみ）
- 型定義は web 側で独自に持つ

### API クライアント設計

- `src/api/client.ts`: 汎用 `post<TReq, TRes>(path, body)` 関数（ベース URL は `VITE_API_URL` 環境変数）
- エンドポイントごとに `src/api/` にファイルを追加する拡張パターン
- Vite 開発サーバーのプロキシで `/api` → ローカル Functions に転送（CORS 回避）

## 理由

### Next.js を採用しない理由

- SSR やファイルベースルーティングは現時点で不要
- Vite の方が軽量で高速。ルーティングが必要になれば `react-router` で対応可能

### API クライアントを独立させる理由

- `@docai/functions` のコードに依存すると、デプロイサイクルが結合する
- HTTP API コントラクトを境界とすることで、フロントエンドとバックエンドを独立して開発・デプロイできる

## 影響

- モノレポに 3 つ目のパッケージが追加される
- CI matrix に `@docai/web` が追加され、ビルド時間が若干増加する
- `packages/web` 用の Docker 設定が追加される
