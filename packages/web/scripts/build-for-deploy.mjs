// firebase deploy の predeploy フックから呼ばれ、デプロイ先プロジェクトに対応する
// Vite の mode を決めてから web をビルドする。
//
// Firebase CLI は predeploy フックに GCLOUD_PROJECT（エイリアス解決後のプロジェクト ID）を
// 渡すため、デプロイ先と env の対応をここで一元管理できる。
// mode を手で指定する運用をなくし、別環境の設定が焼き込まれる事故を防ぐ。
//
// 判定ロジックは副作用を持たない ./deploy-guard.mjs に置き、tests/scripts/ でテストしている。
// このファイルは実行専用にして「読み込まれただけか、実行されたか」の判定を持たない
// （判定を誤ると、ガードが動かないまま終了コード 0 で成功扱いになる）。
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { DEPLOY_MODES, collectEnvProblems, resolveMode } from "./deploy-guard.mjs";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * @param {string} message
 * @returns {never}
 */
function fail(message) {
  console.error(`[build-for-deploy] ${message}`);
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT;
if (!projectId) {
  fail("GCLOUD_PROJECT が未設定です。firebase deploy 経由で実行してください。");
}

const mode = resolveMode(projectId);
if (mode === undefined) {
  const known = Object.entries(DEPLOY_MODES)
    .map(([id, m]) => `${id} → ${m}`)
    .join("\n  ");
  fail(
    `デプロイ先 ${projectId} に対応する mode が未定義です。` +
      `packages/web/scripts/deploy-guard.mjs の DEPLOY_MODES に追記してください。\n` +
      `  定義済み:\n  ${known}`,
  );
}

// Vite 本体と同じ規約（.env → .env.<mode> → .env.local → .env.<mode>.local）で読む。
const problems = collectEnvProblems(loadEnv(mode, webRoot, "VITE_"), projectId);
if (problems.length > 0) {
  fail(
    `packages/web/.env.${mode} の設定に問題があります（デプロイ先: ${projectId}）。\n` +
      problems.map((problem) => `  - ${problem}`).join("\n"),
  );
}

console.log(`[build-for-deploy] デプロイ先 ${projectId} → mode=${mode} でビルドします`);
try {
  execFileSync("npm", ["run", "build", "--", "--mode", mode], { cwd: webRoot, stdio: "inherit" });
} catch (error) {
  // ビルドエラー自体は stdio: inherit で出力済み。スタックトレースを重ねない。
  process.exit(typeof error.status === "number" ? error.status : 1);
}
