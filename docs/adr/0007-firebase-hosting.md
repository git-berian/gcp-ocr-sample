# ADR-0007: Firebase Hosting の採用

## ステータス

承認（ADR-0015 が supersede 提案中）

## コンテキスト

Web フロントエンド（`packages/web`）のデプロイ先が必要。

## 決定

Firebase Hosting を採用し、SPA の静的ファイルを配信する。

- 公開ディレクトリ: `packages/web/dist`（Vite ビルド出力）
- SPA リライト: 全パスを `index.html` にフォールバック

Functions の呼び出しは Firebase SDK の `httpsCallable`（onCall）で行うため、Hosting 側の API プロキシ設定は不要。

## 理由

- Firebase Functions と同じプロジェクトで管理できるため、インフラが一元化される
- `httpsCallable` は Firebase SDK が CORS やプロトコルを自動処理するため、Hosting rewrites による同一オリジンプロキシが不要
- 開発時は `connectFunctionsEmulator` でローカルエミュレータに接続するため、プロキシ設定なしで動作する

検討した代替案:

- **Netlify / Vercel**: Firebase と別管理になり、設定が分散する

## 影響

- `firebase.json` に `hosting` セクションが追加される
- デプロイコマンド: `firebase deploy --only hosting`
- `predeploy` で `npm run build` が実行される
