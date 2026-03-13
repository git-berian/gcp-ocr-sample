import { describe, it, expect, vi, afterEach } from "vitest";
import { loadFunctionsConfig } from "./config.js";

describe("loadFunctionsConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("環境変数からFunctionsConfigを構築する", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("DOCAI_LOCATION", "us");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "abc123");

    const config = loadFunctionsConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "us",
      processorId: "abc123",
    });
  });

  it("必須環境変数が欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    vi.stubEnv("DOCAI_LOCATION", "");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "");
    expect(() => loadFunctionsConfig()).toThrow("Missing env:");
  });
});
