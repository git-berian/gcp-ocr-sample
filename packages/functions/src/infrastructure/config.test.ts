import { describe, it, expect, vi, afterEach } from "vitest";
import { loadFunctionsConfig, loadGeminiConfig } from "./config.js";

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

  it("GCP_PROJECT_IDが欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    vi.stubEnv("DOCAI_LOCATION", "us");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "abc123");
    expect(() => loadFunctionsConfig()).toThrow("Missing env: GCP_PROJECT_ID");
  });

  it("DOCAI_LOCATIONが欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("DOCAI_LOCATION", "");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "abc123");
    expect(() => loadFunctionsConfig()).toThrow("Missing env: DOCAI_LOCATION");
  });

  it("DOCAI_PROCESSOR_IDが欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("DOCAI_LOCATION", "us");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "");
    expect(() => loadFunctionsConfig()).toThrow("Missing env: DOCAI_PROCESSOR_ID");
  });
});

describe("loadGeminiConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("環境変数からGeminiConfigを構築する", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("GEMINI_LOCATION", "asia-northeast1");
    vi.stubEnv("GEMINI_MODEL", "gemini-2.5-pro");

    const config = loadGeminiConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "asia-northeast1",
      model: "gemini-2.5-pro",
    });
  });

  it("GEMINI_LOCATION / GEMINI_MODEL 未設定時は既定値を使う", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("GEMINI_LOCATION", "");
    vi.stubEnv("GEMINI_MODEL", "");

    const config = loadGeminiConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "global",
      model: "gemini-2.5-flash",
    });
  });

  it("GCP_PROJECT_IDが欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    expect(() => loadGeminiConfig()).toThrow("Missing env: GCP_PROJECT_ID");
  });
});
