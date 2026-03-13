import { describe, it, expect, vi, afterEach } from "vitest";
import { mustEnv, loadAppConfig } from "./config.js";

describe("mustEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("環境変数が設定されている場合、値を返す", () => {
    vi.stubEnv("TEST_VAR", "hello");
    expect(mustEnv("TEST_VAR")).toBe("hello");
  });

  it("環境変数が未設定の場合、例外を投げる", () => {
    expect(() => mustEnv("NONEXISTENT_VAR_12345")).toThrow("Missing env: NONEXISTENT_VAR_12345");
  });

  it("環境変数が空文字の場合、例外を投げる", () => {
    vi.stubEnv("EMPTY_VAR", "");
    expect(() => mustEnv("EMPTY_VAR")).toThrow("Missing env: EMPTY_VAR");
  });
});

describe("loadAppConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("必須環境変数からAppConfigを構築する", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("DOCAI_LOCATION", "us");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "abc123");
    vi.stubEnv("FILE_NAME", "receipt.pdf");

    const config = loadAppConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "us",
      processorId: "abc123",
      fileName: "receipt.pdf",
      mimeTypeOverride: undefined,
    });
  });

  it("MIME_TYPE環境変数が設定されている場合、mimeTypeOverrideに反映する", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("DOCAI_LOCATION", "us");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "abc123");
    vi.stubEnv("FILE_NAME", "receipt.pdf");
    vi.stubEnv("MIME_TYPE", "application/pdf");

    const config = loadAppConfig();
    expect(config.mimeTypeOverride).toBe("application/pdf");
  });

  it("必須環境変数が欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    vi.stubEnv("DOCAI_LOCATION", "");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "");
    vi.stubEnv("FILE_NAME", "");
    expect(() => loadAppConfig()).toThrow("Missing env:");
  });
});
