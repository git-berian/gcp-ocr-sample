import type { AppConfig } from "../application/process-document.js";

export function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export function loadAppConfig(): AppConfig {
  return {
    projectId: mustEnv("GCP_PROJECT_ID"),
    location: mustEnv("DOCAI_LOCATION"),
    processorId: mustEnv("DOCAI_PROCESSOR_ID"),
    fileName: mustEnv("FILE_NAME"),
    mimeTypeOverride: process.env.MIME_TYPE || undefined,
  };
}
