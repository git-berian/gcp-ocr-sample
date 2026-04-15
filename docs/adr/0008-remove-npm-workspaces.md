# ADR-0008: npm workspaces の削除と各パッケージの依存独立化

## ステータス

承認

## コンテキスト

npm workspaces を使用した monorepo 構成により、全パッケージの依存がルート `node_modules` に hoisting されていた。これにより以下の問題が発生していた：

- ルートに 467 パッケージが混在し、各パッケージの依存境界が不明確
- WebStorm が各パッケージの `node_modules` からライブラリを解決できず参照エラーが発生
- `package-lock.json` がルートにしか存在せず、各パッケージの依存が独立管理されていない

## 決定

- npm workspaces を削除し、各パッケージが独立した `node_modules` と `package-lock.json` を持つ構成にする
- ルートの `package.json` には Git フック（husky, commitlint, lint-staged）と lint-staged が使用する eslint/prettier のみを devDependencies として保持する
- Docker スクリプトは `--workspace` フラグを廃止し、各コンテナの `working_dir` をパッケージディレクトリに設定する
- CI は `working-directory` で各パッケージディレクトリに移動して実行する
- 同時に `packages/cli` を削除する（Cloud Functions 版に移行済みのため不要）

## 理由

- 各パッケージの依存境界を明確にし、不要なパッケージが混入しない構成にしたかった
- WebStorm の参照エラーを解消するには、各パッケージ直下に `node_modules` が必要だった
- `package-lock.json` をパッケージごとに持つことで、依存バージョンを独立に管理できる

代替案として `.npmrc` に `install-strategy=nested` を設定する方法を検討したが、`package-lock.json` がルートに1つのままとなるため要件を満たさないと判断した。

## 影響

- `--workspace` フラグがルートから使えなくなる（Docker 経由の運用には影響なし）
- 共通依存のバージョン一貫性が自動保証されなくなるため、意図的に揃える運用が必要
- ディスク使用量が増加する（hoisting による重複排除がなくなるため）
- Dependabot がルートの devDependencies も監視するようエントリを追加
