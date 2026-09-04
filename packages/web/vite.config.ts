import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const webRoot = dirname(fileURLToPath(import.meta.url));

// Functions のリージョン。`packages/functions/src/index.ts` の onRequest の指定と揃える。
const FUNCTIONS_REGION = "asia-northeast1";

// ブラウザから叩くパスの接頭辞。同一オリジンにすることで CORS 設定を不要にする。
const API_PREFIX = "/api";

/**
 * エミュレータの URL に現れるプロジェクト ID を決める。
 *
 * `npm start`（functions）は `--project` を付けずにエミュレータを起動するため、
 * 実際には **Firebase CLI のアクティブプロジェクト**が使われる。通常はこれが
 * `.firebaserc` の `default` と一致するので既定値としてそれを読むが、
 * `firebase use <alias>` で切り替えた端末では一致しない。その場合は
 * `FUNCTIONS_EMULATOR_PROJECT` で上書きする。
 */
function resolveProjectId(override: string): string {
  if (override) {
    return override;
  }
  const path = resolve(webRoot, "../../.firebaserc");
  const firebaserc = JSON.parse(readFileSync(path, "utf-8")) as {
    projects?: Record<string, string>;
  };
  const projectId = firebaserc.projects?.default;
  if (!projectId) {
    throw new Error(`.firebaserc に projects.default がありません: ${path}`);
  }
  return projectId;
}

/**
 * 転送先がローカルのエミュレータか判定する。
 *
 * Web はローカル実行専用（ADR-0015）で、転送先は常にローカルのエミュレータになる。
 * これを不変条件としてコードに書き、`API_PROXY_TARGET` に別の値が入ったときは
 * `FUNCTIONS_API_KEY` を送らずに警告する。誤設定は 401 としてしか現れないため、
 * 起動時に気づけるようにするのが狙い。
 */
function isLocalProxyTarget(target: string): boolean {
  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return false;
  }
  // `URL.hostname` は IPv6 をブラケット付き（`[::1]`）で返し、`LOCALHOST` や
  // 10 進表記（`2130706433`）は正規化済みのため、この一覧でよい。
  // 0.0.0.0 はエミュレータの待ち受けアドレス（firebase.json）で、Docker を使わない場合に指定されうる。
  // host.docker.internal はコンテナからホストへの折り返しで、外部には出ない。
  return ["localhost", "127.0.0.1", "[::1]", "0.0.0.0", "host.docker.internal"].includes(
    url.hostname,
  );
}

/** 設定漏れは全リクエストの 401 として現れるため、起動時に気づけるようにする。 */
function warnIfApiKeyUnusable(apiKey: string): void {
  if (!apiKey) {
    console.warn(
      "[vite] FUNCTIONS_API_KEY が未設定です。packages/web/.env.local に設定してください。" +
        "未設定のままだと Functions が 401「認証が必要です。」を返します。",
    );
  } else if (apiKey.startsWith("your-")) {
    console.warn(
      "[vite] FUNCTIONS_API_KEY が .env.example の雛形値のままです。" +
        "実際の値に置き換えてください（Functions が 401「無効な API キーです。」を返します）。",
    );
  }
}

export default defineConfig(({ mode }) => {
  // FUNCTIONS_API_KEY は VITE_ 接頭辞を持たないため、明示的に読まないと process.env に載らない。
  // dev サーバー（Node 側）だけが参照し、バンドルには含めない。
  const env = loadEnv(mode, webRoot, "");
  const apiKey = env.FUNCTIONS_API_KEY ?? "";
  const target = env.API_PROXY_TARGET || "http://localhost:8080";
  const projectId = resolveProjectId(env.FUNCTIONS_EMULATOR_PROJECT ?? "");
  warnIfApiKeyUnusable(apiKey);

  // 転送先がローカルのエミュレータでなければ認証ヘッダーを付けない。
  const attachAuth = Boolean(apiKey) && isLocalProxyTarget(target);
  if (apiKey && !attachAuth) {
    console.warn(
      `[vite] API_PROXY_TARGET (${target}) がローカルのエミュレータではないため、` +
        "FUNCTIONS_API_KEY を送信しません。Functions は 401「認証が必要です。」を返します。",
    );
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        [API_PREFIX]: {
          target,
          changeOrigin: true,
          // /api/<関数名> → /<project>/<region>/<関数名>（Functions エミュレータの URL 形）
          rewrite: (path) =>
            path.replace(new RegExp(`^${API_PREFIX}`), `/${projectId}/${FUNCTIONS_REGION}`),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              // onRequest は Bearer 認証必須。キーをブラウザに渡さないため、ここで付与する。
              if (attachAuth) {
                proxyReq.setHeader("Authorization", `Bearer ${apiKey}`);
              }
            });
          },
        },
      },
    },
  };
});
