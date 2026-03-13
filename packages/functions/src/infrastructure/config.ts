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
