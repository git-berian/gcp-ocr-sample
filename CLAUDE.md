## 開発コマンドの実行

- lint / test / build 等の開発コマンドは **Docker 経由で実行する**（`npm run docker:<pkg>:*`）
- ローカルの Node.js バージョンに依存しないようにするため
- CLI: `docker:cli:lint`, `docker:cli:test`, `docker:cli:test:coverage`, `docker:cli:sh`
- Functions: `docker:functions:lint`, `docker:functions:test`, `docker:functions:test:coverage`, `docker:functions:sh`

---

## 参照先

- 開発規約・コミット規約・ブランチ命名等 → `CONTRIBUTING.md`
- コミット作成 → `.claude/skills/commit.md`
- タスク開始フロー → `.claude/skills/task-start.md`
- PR 作成 → `.claude/skills/create-pr.md`
- AI駆動開発ガイドライン → `docs/ai-development-guidelines.md`
