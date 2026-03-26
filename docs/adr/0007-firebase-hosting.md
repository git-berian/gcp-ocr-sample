# ADR-0007: Firebase Hosting の採用

## ステータス

承認

## コンテキスト

Web フロントエンド（`packages/web`）のデプロイ先が必要。
本番環境で Web から Firebase Functions（API）を呼び出す際、異なるオリジン間の通信には CORS 対応が必要になる。

## 決定

Firebase Hosting を採用し、`/api/**` へのリクエストは Cloud Run rewrites で Gen2 Functions にプロキシする。

- 公開ディレクトリ: `packages/web/dist`（Vite ビルド出力）
- SPA リライト: 全パスを `index.html` にフォールバック
- API プロキシ: `/api/**` → Cloud Run サービス `parsedocument`（asia-northeast1）

## 理由

- Firebase Functions と同じプロジェクトで管理できるため、インフラが一元化される
- Hosting rewrites で同一オリジンのプロキシが実現でき、Functions 側の CORS 対応が不要
- 開発時の Vite proxy（`/api` → Functions エミュレータ）と本番の Hosting rewrites で、クライアントコードを変更せずに動作する

検討した代替案:

- **Netlify / Vercel**: Firebase と別管理になり、API プロキシの設定が複雑化する
- **Functions URL 直指定**（`VITE_API_URL`）: 別オリジンになるため Functions 側に CORS 設定が必要

## 影響

- `firebase.json` に `hosting` セクションが追加される
- デプロイコマンド: `firebase deploy --only hosting`
- `predeploy` で `npm run docker:web:build` が実行されるため、デプロイ時に Docker が起動している必要がある
- 開発時は Vite proxy が `/api` プレフィックスを除去するが、本番では `/api/parse` がそのまま Functions に届く。現在のハンドラーはパスルーティングしていないため問題ないが、将来ルーティングを導入する場合は要注意
