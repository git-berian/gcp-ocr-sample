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

export interface ClaudeConfig {
  projectId: string;
  location: string;
  model: string;
  timeoutMs: number;
}

export function loadClaudeConfig(): ClaudeConfig {
  const rawTimeout = Number(process.env.CLAUDE_TIMEOUT_MS);
  return {
    projectId: mustEnv("GCP_PROJECT_ID"),
    location: process.env.CLAUDE_LOCATION || "global",
    model: process.env.CLAUDE_MODEL || "claude-opus-4-8",
    timeoutMs: Number.isFinite(rawTimeout) && rawTimeout > 0 ? rawTimeout : 30000,
  };
}
