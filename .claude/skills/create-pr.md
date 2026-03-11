---
description: PR作成時に使用。「PR作成して」等の依頼で自動トリガー。
---

# PR 作成規則

## テンプレート

`.github/pull_request_template.md` に従って PR 本文を作成する。

## 手順

1. `git push -u origin <ブランチ名>` でリモートにプッシュ
2. `gh pr create` で PR を作成

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
