# OCR Sample

Google Cloud Document AI を使用してレシート等の画像・PDF から情報を抽出する OCR ツールです。
Docker 上で動作します。

## 必要なもの

- Docker / Docker Compose
- GCP プロジェクト（Document AI API が有効化済み）
- Document AI プロセッサ（Expense Parser 等）
- サービスアカウントキー（JSON）

## セットアップ

### 1. サービスアカウントキーの配置

GCP コンソールからサービスアカウントキーをダウンロードし、`secrets/sa.json` として配置してください。

```
secrets/sa.json
```

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下を記載してください。

```env
GCP_PROJECT_ID=your-gcp-project-id
DOCAI_LOCATION=us
DOCAI_PROCESSOR_ID=your-processor-id
FILE_NAME=receipt.jpg
```

| 変数名 | 説明 |
|--|--|
| `GCP_PROJECT_ID` | GCP プロジェクト ID |
| `DOCAI_LOCATION` | プロセッサのロケーション（`us` / `eu` 等） |
| `DOCAI_PROCESSOR_ID` | Document AI プロセッサ ID |
| `FILE_NAME` | `input/` 配下の解析対象ファイル名 |
| `MIME_TYPE` | （任意）MIME タイプを明示する場合に指定。未指定時は拡張子から自動判定 |

### 3. 解析対象ファイルの配置

解析したい画像や PDF を `input/` ディレクトリに配置してください。

対応フォーマット: PDF (`.pdf`)、PNG (`.png`)、JPEG (`.jpg` / `.jpeg`)

## 使い方

```bash
docker-compose up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。

## ディレクトリ構成

```
.
├── Dockerfile
├── docker-compose.yml
├── index.js              # メイン処理
├── package.json
├── input/                # 解析対象ファイルを配置
├── logs/                 # 解析結果ログ
└── secrets/              # サービスアカウントキー（git管理外）
```

## 技術スタック

| Tool | Version |
|--|--|
| Node.js | 20 (Docker イメージ: node:20-slim) |
| @google-cloud/documentai | ^8.0.0 |
