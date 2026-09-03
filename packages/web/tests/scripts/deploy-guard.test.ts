import { describe, expect, it } from "vitest";
import { DEPLOY_MODES, collectEnvProblems, resolveMode } from "../../scripts/deploy-guard.mjs";

const PROJECT_ID = "example-project";

/** 問題のない env（デプロイ先と一致した実値） */
function validEnv(projectId: string = PROJECT_ID): Record<string, string> {
  return {
    VITE_FIREBASE_API_KEY: "AIzaSyExample",
    VITE_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
    VITE_FIREBASE_PROJECT_ID: projectId,
    VITE_FIREBASE_STORAGE_BUCKET: `${projectId}.firebasestorage.app`,
    VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789012",
    VITE_FIREBASE_APP_ID: "1:123456789012:web:abcdef",
    VITE_APP_PASSWORD: "s3cret",
  };
}

describe("resolveMode", () => {
  const modes = { "example-project": "development" };

  it("定義済みのデプロイ先の mode を返す", () => {
    expect(resolveMode("example-project", modes)).toBe("development");
  });

  it("GCLOUD_PROJECT 未設定なら undefined を返す", () => {
    expect(resolveMode(undefined, modes)).toBeUndefined();
    expect(resolveMode("", modes)).toBeUndefined();
  });

  it("未定義のデプロイ先なら undefined を返す", () => {
    expect(resolveMode("unknown-project", modes)).toBeUndefined();
  });

  it("prototype 上のキーを mode として拾わない", () => {
    expect(resolveMode("constructor", modes)).toBeUndefined();
    expect(resolveMode("toString", modes)).toBeUndefined();
  });

  it("既定の DEPLOY_MODES に開発プロジェクトが定義されている", () => {
    expect(DEPLOY_MODES["documentaisample-488504"]).toBe("development");
  });
});

describe("collectEnvProblems", () => {
  it("デプロイ先と一致した実値なら問題を返さない", () => {
    expect(collectEnvProblems(validEnv(), PROJECT_ID)).toEqual([]);
  });

  it("必須キーが欠けていれば未設定として報告する", () => {
    const env = validEnv();
    delete env.VITE_FIREBASE_API_KEY;
    env.VITE_FIREBASE_APP_ID = "";

    const problems = collectEnvProblems(env, PROJECT_ID);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("未設定");
    expect(problems[0]).toContain("VITE_FIREBASE_API_KEY");
    expect(problems[0]).toContain("VITE_FIREBASE_APP_ID");
  });

  it("VITE_APP_PASSWORD が未設定なら未設定として報告する", () => {
    // 未設定だと App.tsx が PasswordGate を外し、保護なしで公開される。
    const env = validEnv();
    delete env.VITE_APP_PASSWORD;

    const problems = collectEnvProblems(env, PROJECT_ID);

    expect(problems).toEqual(["未設定: VITE_APP_PASSWORD"]);
  });

  it(".env.example の雛形値が残っていれば報告する", () => {
    const env = { ...validEnv(), VITE_FIREBASE_PROJECT_ID: "your-project-id" };

    const problems = collectEnvProblems(env, PROJECT_ID);

    expect(problems.some((problem) => problem.startsWith("雛形値のまま"))).toBe(true);
    expect(problems.some((problem) => problem.includes("VITE_FIREBASE_PROJECT_ID"))).toBe(true);
  });

  it("別プロジェクトの実値ならデプロイ先との不一致を報告する", () => {
    const problems = collectEnvProblems(validEnv("other-project"), PROJECT_ID);

    expect(problems).toEqual(["VITE_FIREBASE_PROJECT_ID がデプロイ先と不一致: other-project"]);
  });

  it("必須キーが欠けている場合は不一致を重ねて報告しない", () => {
    const env = validEnv("other-project");
    delete env.VITE_FIREBASE_API_KEY;

    const problems = collectEnvProblems(env, PROJECT_ID);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("未設定");
  });
});
