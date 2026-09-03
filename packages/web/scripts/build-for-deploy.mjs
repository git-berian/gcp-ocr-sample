// firebase deploy の predeploy フックから呼ばれ、デプロイ先プロジェクトに対応する
// Vite の mode を決めてから web をビルドする。
//
// Firebase CLI は predeploy フックに GCLOUD_PROJECT（エイリアス解決後のプロジェクト ID）を
// 渡すため、デプロイ先と env の対応をここで一元管理できる。
// mode を手で指定する運用をなくし、別環境の設定が焼き込まれる事故を防ぐ。
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

/**
 * デプロイ先プロジェクト ID → Vite の mode（= 読み込む `.env.<mode>`）。
 * 新しいデプロイ先を追加するときは、`.firebaserc` のエイリアスと
 * `.env.<mode>` の作成にあわせてここへ追記する。
 */
const DEPLOY_MODES = {
  "documentaisample-488504": "development",
};

/** バンドルに焼き込まれる Firebase 設定。1 つでも欠けると Functions 呼び出しに失敗する。 */
const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

/**
 * `.env.example` の雛形値を見分けるための接頭辞。
 * `.env.example` の値は必ずこの接頭辞で始めること（本ガードが検知できなくなるため）。
 */
const PLACEHOLDER_PREFIX = "your-";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function fail(message) {
  console.error(`[build-for-deploy] ${message}`);
  process.exit(1);
}

function resolveMode(projectId) {
  if (!projectId) {
    fail("GCLOUD_PROJECT が未設定です。firebase deploy 経由で実行してください。");
  }

  if (!Object.hasOwn(DEPLOY_MODES, projectId)) {
    const known = Object.entries(DEPLOY_MODES)
      .map(([id, m]) => `${id} → ${m}`)
      .join("\n  ");
    fail(
      `デプロイ先 ${projectId} に対応する mode が未定義です。` +
        `packages/web/scripts/build-for-deploy.mjs の DEPLOY_MODES に追記してください。\n` +
        `  定義済み:\n  ${known}`,
    );
  }
  return DEPLOY_MODES[projectId];
}

function assertEnvIsConfigured(mode, projectId) {
  // Vite 本体と同じ規約（.env → .env.<mode> → .env.local → .env.<mode>.local）で読む。
  const env = loadEnv(mode, webRoot, "VITE_");

  const missing = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  const placeholders = REQUIRED_ENV_KEYS.filter((key) => env[key]?.startsWith(PLACEHOLDER_PREFIX));
  // 値が埋まっていても別プロジェクトの設定なら、Functions の呼び出し先がデプロイ先と食い違う。
  const mismatched =
    missing.length === 0 && env.VITE_FIREBASE_PROJECT_ID !== projectId
      ? env.VITE_FIREBASE_PROJECT_ID
      : undefined;

  if (missing.length === 0 && placeholders.length === 0 && mismatched === undefined) {
    return;
  }

  const details = [];
  if (missing.length > 0) {
    details.push(`未設定: ${missing.join(", ")}`);
  }
  if (placeholders.length > 0) {
    details.push(`雛形値のまま: ${placeholders.join(", ")}`);
  }
  if (mismatched !== undefined) {
    details.push(`VITE_FIREBASE_PROJECT_ID がデプロイ先と不一致: ${mismatched}`);
  }
  fail(
    `packages/web/.env.${mode} の設定に問題があります（デプロイ先: ${projectId}）。\n` +
      details.map((detail) => `  - ${detail}`).join("\n"),
  );
}

const projectId = process.env.GCLOUD_PROJECT;
const mode = resolveMode(projectId);
assertEnvIsConfigured(mode, projectId);

console.log(`[build-for-deploy] デプロイ先 ${projectId} → mode=${mode} でビルドします`);
try {
  execFileSync("npm", ["run", "build", "--", "--mode", mode], { cwd: webRoot, stdio: "inherit" });
} catch (error) {
  // ビルドエラー自体は stdio: inherit で出力済み。スタックトレースを重ねない。
  process.exit(typeof error.status === "number" ? error.status : 1);
}
