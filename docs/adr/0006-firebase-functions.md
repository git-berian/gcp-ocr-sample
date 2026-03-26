# ADR-0006: Firebase Functions への移行

## ステータス

承認

## コンテキスト

`packages/functions` を GCP にデプロイする必要がある。現在は `@google-cloud/functions-framework` を使用しているが、デプロイやローカル開発のためのツールチェインが不足している。

## 決定

`@google-cloud/functions-framework` から `firebase-functions` SDK（Gen2）に移行する。

- `firebase-functions/v2/https` の `onRequest` を使用
- `firebase-admin` を追加
- デプロイは `firebase deploy --only functions` で実行
- ローカル開発は Firebase Emulator Suite を使用

## 理由

- **デプロイの容易さ**: `firebase deploy` コマンド一つでデプロイ可能
- **エミュレータ**: Firebase Emulator Suite でローカルテストが容易
- **Gen2 互換**: Cloud Functions 2nd gen（Cloud Run ベース）として動作し、スケーリングやタイムアウト設定が柔軟
- **Express 互換**: ハンドラーの req/res 型は Express 互換のため、既存のハンドラーロジックへの影響が最小限

### 検討した代替案

- **Cloud Functions を gcloud CLI で直接デプロイ**: 可能だが、エミュレータやプロジェクト管理の統合が弱い
- **Cloud Run に直接デプロイ**: より柔軟だが、現段階では過剰。将来的に必要になれば移行可能

## 影響

- デプロイは手動（`firebase deploy`）。CI/CD 自動デプロイは対象外
- Firebase プロジェクトの事前作成と `firebase login` が前提条件
- `firebase.json` と `.firebaserc` がプロジェクトルートに追加される
- ハンドラー層の型が `HttpFunction` から `firebase-functions/v2/https` の `Request` に変更
- application / domain / infrastructure 層は変更なし
