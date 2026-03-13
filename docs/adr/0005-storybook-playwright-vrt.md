# ADR-0005: Storybook + Playwright による Visual Regression Testing の導入

## ステータス

承認

## コンテキスト

Issue #96 でデザイン刷新を予定しており、その前にコンポーネントの見た目のリグレッションを検知する仕組みが必要だった。また、コンポーネントカタログがないため、UI コンポーネントの状態バリエーションを一覧・確認する手段がなかった。

## 決定

- **Storybook 10.3 (alpha)** をコンポーネントカタログとして導入する
- **Playwright** の `toHaveScreenshot()` を使った Visual Regression Testing（VRT）を導入する
- Playwright は専用の Docker コンテナ（`Dockerfile.playwright`）で実行し、web コンテナと分離する
- CI に `visual-regression` ジョブを追加する

## 理由

### Storybook 10.3 (alpha) の採用

- Storybook 8 / 9 / 10 (stable) はいずれも Vite 8 を peer dependency でサポートしていない
- 10.3.0-alpha.16 が Vite 8 対応（`vite@^5.0.0 || ^6.0.0 || ^7.0.0 || ^8.0.0`）の最初のバージョン
- alpha 版のリスクはあるが、Storybook の使用範囲が開発・テスト用途に限定されるため許容可能
- stable リリース後に更新する

### Playwright の採用

- `toHaveScreenshot()` による無料のピクセルレベル差分検知が可能
- Chromium のみで実行（VRT の目的は一貫性検証であり、クロスブラウザテストではない）

### Docker 分離

- Playwright はブラウザバイナリが必要で、web コンテナに含めるとイメージが肥大化する
- `mcr.microsoft.com/playwright` ベースの専用イメージで分離

### 検討した代替案

- **Percy / Chromatic**: 有料 SaaS。現時点では無料の Playwright で十分
- **Storybook test runner**: VRT 専用ではなく、スクリーンショット比較の設定が複雑

## 影響

- **メリット**: デザイン変更時のリグレッション検知、コンポーネントカタログによるレビュー効率化
- **デメリット**: alpha 版への依存、ベースラインスクリーンショットの git 管理によるリポジトリサイズ増加
- **制約**: VRT のベースライン更新は Linux (Docker) 環境で実行する必要がある（OS 間のレンダリング差異を防ぐため）
