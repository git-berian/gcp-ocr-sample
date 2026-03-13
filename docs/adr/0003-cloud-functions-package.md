# ADR-0003: Cloud Functions パッケージの新設と CLI リネーム

## ステータス

承認

## コンテキスト

現在のプロジェクトは CLI ツール（`packages/api`）としてのみ動作していたが、GCP Cloud Functions（第2世代）の HTTP API としても公開する必要が出てきた。将来的には Cloud Functions 版に移行し、CLI 版は削除予定。

## 決定

- `packages/api` を `packages/cli` にリネームする
- `packages/functions` を新設し、Cloud Functions 用の独立パッケージとする
- 両パッケージ間でコードの共有はせず、完全に独立させる
- `packages/functions` も ADR-0001 のクリーンアーキテクチャに従い、HTTP ハンドラ層（`handlers/`）を追加した 4 層構成とする

## 理由

- CLI はファイルパスから読み取り、Functions は HTTP リクエストから base64 コンテンツを受け取るため、インターフェースが根本的に異なる
- 将来的に CLI を削除する予定のため、共有ライブラリを作って依存関係を作ると削除時の負担が増える
- 独立パッケージにすることで、それぞれ独立してデプロイ・テスト・削除が可能

代替案として共有ライブラリ（`packages/shared`）を作る案を検討したが、CLI 削除時に不要な共有コードが残るリスクと、パッケージ間の依存管理コストが見合わないと判断した。

## 影響

- CI は workspace matrix で両パッケージを並列にチェックする構成に変更
- Dependabot も両パッケージを監視対象に追加
- コードの重複（`document-ai-client.ts` 等）が発生するが、CLI 削除時にクリーンに解消される
- `packages/cli` は将来削除予定であることを明示（README に記載）
