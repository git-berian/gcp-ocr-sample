// デプロイ先プロジェクトから Vite の mode を決め、バンドルに焼き込まれる設定を検証する。
// 副作用を持たない純関数だけを置き、実行は build-for-deploy.mjs が担う。

/**
 * デプロイ先プロジェクト ID → Vite の mode（= 読み込む `.env.<mode>`）。
 * 新しいデプロイ先を追加するときは、`.firebaserc` のエイリアスと
 * `.env.<mode>` の作成にあわせてここへ追記する。
 * @type {Record<string, string>}
 */
export const DEPLOY_MODES = {
  "documentaisample-488504": "development",
  // プロジェクトを作成したらコメントを外して ID を入れる。
  // `.firebaserc` のエイリアス追加と `.env.<mode>` の作成もあわせて必要（README 参照）。
  // "<staging-project-id>": "staging",
  // "<production-project-id>": "production",
};

/**
 * デプロイ時に必ず設定されていなければならないキー。
 * - `VITE_FIREBASE_*`: 1 つでも欠けると Functions 呼び出しに失敗する
 * - `VITE_APP_PASSWORD`: 未設定だと `App.tsx` が PasswordGate を丸ごと外し、UI が素で公開される。
 *   値はバンドルに含まれるため UI の目隠しであり、Functions 側の保護ではない
 */
const REQUIRED_ENV_KEYS = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
  "VITE_APP_PASSWORD",
];

/**
 * `.env.example` の雛形値を見分けるための接頭辞。
 * `.env.example` の値は必ずこの接頭辞で始めること（本ガードが検知できなくなるため）。
 */
const PLACEHOLDER_PREFIX = "your-";

/**
 * デプロイ先プロジェクトに対応する mode を返す。未定義なら undefined。
 * @param {string | undefined} projectId
 * @param {Record<string, string>} [modes]
 * @returns {string | undefined}
 */
export function resolveMode(projectId, modes = DEPLOY_MODES) {
  if (!projectId) {
    return undefined;
  }
  // `constructor` 等の prototype 上のキーを拾わないよう hasOwn で見る。
  return Object.hasOwn(modes, projectId) ? modes[projectId] : undefined;
}

/**
 * バンドルに焼き込まれる設定の問題を列挙する。問題が無ければ空配列。
 * @param {Record<string, string | undefined>} env
 * @param {string} projectId
 * @returns {string[]}
 */
export function collectEnvProblems(env, projectId) {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !env[key]);
  const placeholders = REQUIRED_ENV_KEYS.filter((key) => env[key]?.startsWith(PLACEHOLDER_PREFIX));
  // 値が埋まっていても別プロジェクトの設定なら、Functions の呼び出し先がデプロイ先と食い違う。
  const mismatched =
    missing.length === 0 && env.VITE_FIREBASE_PROJECT_ID !== projectId
      ? env.VITE_FIREBASE_PROJECT_ID
      : undefined;

  const problems = [];
  if (missing.length > 0) {
    problems.push(`未設定: ${missing.join(", ")}`);
  }
  if (placeholders.length > 0) {
    problems.push(`雛形値のまま: ${placeholders.join(", ")}`);
  }
  if (mismatched !== undefined) {
    problems.push(`VITE_FIREBASE_PROJECT_ID がデプロイ先と不一致: ${mismatched}`);
  }
  return problems;
}
