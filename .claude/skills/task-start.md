---
description: 新しいタスクや機能の実装を開始するときに使用。Issue作成からブランチ作成、計画立案までのフローを実行する。
---

# タスク開始フロー

以下の手順を順番に実行する。

## 1. Issue を作成する

作業を始める前に必ず GitHub Issue を作成する。

## 2. main を最新化する

```bash
git checkout main && git pull origin main
```

## 3. 作業ブランチを作成する

`<type>/#<issue番号>-<説明>` の形式でブランチを切る。

type 一覧：
- `feature` — 新機能
- `fix` — バグ修正
- `refactor` — リファクタリング
- `docs` — ドキュメント
- `chore` — 設定・依存関係など

例：`feature/#3-typescript-migration`

## 4. 計画を立てる

`tasks/todo-#<issue番号>.md` にチェック可能な項目として計画を書く。

## 5. 計画を確認する

実装を開始する前にユーザーに計画を提示して確認を取る。

## 進行中のルール

- 完了した項目を随時マークしていく
- 各ステップで高レベルのサマリーを提供する
- 完了後に `tasks/todo-#<issue番号>.md` にレビューセクションを追加する
- 修正を受けた後に `tasks/lessons.md` を更新する
- プロジェクト構成に影響する変更時は README.md も都度更新する
