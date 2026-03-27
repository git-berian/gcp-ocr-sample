# @docai/cli

Document AI を使用してレシート等の画像・PDF から情報を抽出する CLI ツールです。

## 開発コマンド

```bash
npm run docker:cli:lint           # ESLint 実行
npm run docker:cli:format:check   # Prettier チェック
npm run docker:cli:test           # テスト実行
npm run docker:cli:test:coverage  # テスト + カバレッジ計測
npm run docker:cli:sh             # コンテナに入って操作
npm run docker:cli:build          # Docker イメージのビルド
```

### コンテナ内での操作

```bash
npm run docker:cli:sh
# コンテナ内で
npm run build -w @docai/cli            # TypeScript ビルド
npm run lint:fix -w @docai/cli         # ESLint 自動修正
npm run format -w @docai/cli           # Prettier フォーマット
npm run test:unit -w @docai/cli        # ユニットテストのみ
npm run test:integration -w @docai/cli # 統合テストのみ
npm run test:coverage -w @docai/cli    # テスト + カバレッジ計測
npm run test:watch -w @docai/cli       # テスト実行（ウォッチモード）
```

## OCR を実行する

### 開発コンテナ内で実行する場合

```bash
npm run docker:cli:sh
# コンテナ内で
npm run build -w @docai/cli
npm run start -w @docai/cli
```

### 本番用の docker-compose で一括実行する場合

```bash
docker-compose -f packages/cli/docker/docker-compose.prod.yml up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。
