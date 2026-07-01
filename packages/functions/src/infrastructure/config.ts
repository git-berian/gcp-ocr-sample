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
}

export function loadGeminiConfig(): GeminiConfig {
  return {
    projectId: mustEnv("GCP_PROJECT_ID"),
    location: process.env.GEMINI_LOCATION || "global",
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  };
}
