# ADR-0002: @google-cloud/documentai v9 へのアップグレード

## ステータス

承認

## コンテキスト

`@google-cloud/documentai` v8 を使用していたが、Dependabot により v9 へのアップグレードが提案された。メジャーバージョンアップのため、破壊的変更の影響を評価する必要があった。

## 決定

v9 にアップグレードする。

## 理由

- v9 の破壊的変更はこのプロジェクトの使用範囲に影響しなかった
- セキュリティパッチや新機能を継続的に受けるため、最新メジャーバージョンに追従する方針
- クリーンアーキテクチャ（ADR-0001）により、影響範囲が infrastructure 層に限定されていた

## 影響

- infrastructure 層の `document-ai-client.ts` のみ変更
- domain 層・application 層への影響なし
- 今後も同様のメジャーバージョンアップ時は、infrastructure 層の変更のみで対応可能
