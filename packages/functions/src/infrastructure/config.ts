export interface FunctionsConfig {
  projectId: string;
  location: string;
  processorId: string;
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function loadFunctionsConfig(): FunctionsConfig {
  return {
    projectId: mustEnv("GCP_PROJECT_ID"),
    location: mustEnv("DOCAI_LOCATION"),
    processorId: mustEnv("DOCAI_PROCESSOR_ID"),
  };
}

export interface GeminiConfig {
  projectId: string;
  location: string;
  model: string;
  timeoutMs: number;
}

export function loadGeminiConfig(): GeminiConfig {
  const rawTimeout = Number(process.env.GEMINI_TIMEOUT_MS);
  return {
    projectId: mustEnv("GCP_PROJECT_ID"),
    location: process.env.GEMINI_LOCATION || "global",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    timeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 30000,
  };
}

interface ClaudeConfigBase {
  model: string;
  timeoutMs: number;
}

// トランスポート（呼び出し経路）で必要な設定が異なるため判別可能ユニオンにする（ADR-0013）。
// - vertex: Vertex AI 経由（ADC 認証・projectId/location）
// - api: Anthropic 直接 API（ANTHROPIC_API_KEY）
export type ClaudeConfig =
  | (ClaudeConfigBase & { transport: "vertex"; projectId: string; location: string })
  | (ClaudeConfigBase & { transport: "api"; apiKey: string });

export function loadClaudeConfig(): ClaudeConfig {
  const rawTimeout = Number(process.env.CLAUDE_TIMEOUT_MS);
  const model = process.env.CLAUDE_MODEL || "claude-opus-4-8";
  const timeoutMs = Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 30000;
  // 既定は api（Vertex クォータ非依存で動作する経路。ADR-0013）。
  // 未設定/空は api。未知の非空値は誤設定（例: "vertex" の typo で PII が
  // 意図せず Anthropic API に送られる）を防ぐため明示エラーにする。
  const rawTransport = process.env.CLAUDE_TRANSPORT;
  if (rawTransport && rawTransport !== "api" && rawTransport !== "vertex") {
    throw new Error(`Invalid CLAUDE_TRANSPORT: ${rawTransport}（api | vertex）`);
  }
  const transport = rawTransport === "vertex" ? "vertex" : "api";

  if (transport === "vertex") {
    return {
      transport,
      projectId: mustEnv("GCP_PROJECT_ID"),
      location: process.env.CLAUDE_LOCATION || "global",
      model,
      timeoutMs,
    };
  }
  return {
    transport,
    apiKey: mustEnv("ANTHROPIC_API_KEY"),
    model,
    timeoutMs,
  };
}
