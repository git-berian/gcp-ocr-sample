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

`.env.example` をコピーして `.env` を作成し、値を設定してください。

```bash
cp .env.example .env
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

### 開発環境

```bash
docker-compose -f docker/docker-compose.yml up --build
```

### 本番環境

```bash
docker-compose -f docker/docker-compose.prod.yml up --build
```

実行すると、Document AI で解析された entities が JSON 形式で標準出力に表示されます。

別のファイルを解析する場合は `.env` の `FILE_NAME` を変更して再実行してください。

## Docker 構成

| ファイル | 用途 | 説明 |
|--|--|--|
| `docker/Dockerfile` | 開発環境 | 全依存インストール + TypeScript ビルド |
| `docker/Dockerfile.prod` | 本番環境 | マルチステージビルドで本番依存のみ含む |
| `docker/docker-compose.yml` | 開発環境 | `Dockerfile` を使用 |
| `docker/docker-compose.prod.yml` | 本番環境 | `Dockerfile.prod` を使用 |

## ディレクトリ構成

```
.
├── docker/
│   ├── Dockerfile              # 開発環境用
│   ├── Dockerfile.prod         # 本番環境用
│   ├── docker-compose.yml      # 開発環境用
│   └── docker-compose.prod.yml # 本番環境用
├── src/
│   └── index.ts                # メイン処理
├── tsconfig.json
├── package.json
├── input/                      # 解析対象ファイルを配置
├── logs/                       # 解析結果ログ
└── secrets/                    # サービスアカウントキー（git管理外）
```

## 技術スタック

| Tool | Version |
|--|--|
| Node.js | 20 (Docker イメージ: node:20-slim) |
| TypeScript | ^5.9 |
| @google-cloud/documentai | ^8.0.0 |
