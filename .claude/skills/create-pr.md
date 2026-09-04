---
description: PR作成時に使用。「PR作成して」等の依頼で自動トリガー。
---

# PR 作成規則

## テンプレート

`.github/pull_request_template.md` に従って PR 本文を作成する。

## 手順

1. セルフレビューを実施する
   - `git diff main...HEAD` で全変更を確認
   - PR テンプレートのチェックリスト全項目を確認
   - セキュリティ・エラーハンドリング・設計の観点で問題がないことを確認
2. `git push -u origin <ブランチ名>` でリモートにプッシュ
3. `gh pr create` で PR を作成
4. **実コードの変更を含む PR は、`@coderabbitai review` をコメントしてレビューを手動起動する**
   - このリポジトリでは CodeRabbit の自動レビューが走らない（後述）
   - ドキュメントのみの PR は対象外

## ルール

- `Closes #<issue番号>` を必ず含め、マージ時に Issue が自動クローズされるようにする
- コミットメッセージの `関連:` と PR の `Closes` は役割が異なることに注意
  - `関連:` → コミットと Issue の紐付け（参照のみ）
  - `Closes` → PR マージ時に Issue を自動クローズ
- PR 本文には変更内容・変更理由・影響範囲を具体的に記載する

## PR ルール

- **マージ戦略**: Squash and merge
- **レビュー**: 1 人以上の承認が必要
- **CI**: 全ジョブがパスしていることが必須

## CodeRabbit のレビュー起動

`.coderabbit.yaml` の `auto_review` は有効だが、**CodeRabbit 側のポリシーで上書きされており自動レビューは走らない**。

> This repository does not receive automatic reviews because it has fewer than 10 stars.

そのため、コード PR では `@coderabbitai review` をコメントして手動で起動する。
`CodeRabbit` の CI チェックはスキップ時も SUCCESS になるため、**チェックの緑はレビュー実施の証拠にならない**。
実際にレビューコメントが付いたかを確認すること。
