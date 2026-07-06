import { describe, it, expect, vi, afterEach } from "vitest";
import { loadFunctionsConfig, loadGeminiConfig, loadClaudeConfig } from "./config.js";

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
    vi.stubEnv("GEMINI_TIMEOUT_MS", "15000");

    const config = loadGeminiConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "asia-northeast1",
      model: "gemini-2.5-pro",
      timeoutMs: 15000,
    });
  });

  it("GEMINI_LOCATION / GEMINI_MODEL / GEMINI_TIMEOUT_MS 未設定時は既定値を使う", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("GEMINI_LOCATION", "");
    vi.stubEnv("GEMINI_MODEL", "");
    vi.stubEnv("GEMINI_TIMEOUT_MS", "");

    const config = loadGeminiConfig();
    expect(config).toEqual({
      projectId: "my-project",
      location: "global",
      model: "gemini-2.5-flash",
      timeoutMs: 30000,
    });
  });

  it("GEMINI_TIMEOUT_MS が不正値なら既定値 30000 を使う", () => {
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("GEMINI_TIMEOUT_MS", "abc");

    expect(loadGeminiConfig().timeoutMs).toBe(30000);
  });

  it("GCP_PROJECT_IDが欠けている場合、例外を投げる", () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    expect(() => loadGeminiConfig()).toThrow("Missing env: GCP_PROJECT_ID");
  });
});

describe("loadClaudeConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("既定（CLAUDE_TRANSPORT 未設定）は api トランスポートで ANTHROPIC_API_KEY を読む", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("CLAUDE_MODEL", "claude-sonnet-5");
    vi.stubEnv("CLAUDE_TIMEOUT_MS", "15000");

    expect(loadClaudeConfig()).toEqual({
      transport: "api",
      apiKey: "sk-ant-test",
      model: "claude-sonnet-5",
      timeoutMs: 15000,
    });
  });

  it("api: CLAUDE_MODEL / CLAUDE_TIMEOUT_MS 未設定時は既定値を使う", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("CLAUDE_MODEL", "");
    vi.stubEnv("CLAUDE_TIMEOUT_MS", "");

    expect(loadClaudeConfig()).toEqual({
      transport: "api",
      apiKey: "sk-ant-test",
      model: "claude-opus-4-8",
      timeoutMs: 30000,
    });
  });

  it("api: ANTHROPIC_API_KEY が欠けている場合、例外を投げる", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    expect(() => loadClaudeConfig()).toThrow("Missing env: ANTHROPIC_API_KEY");
  });

  it("vertex: CLAUDE_TRANSPORT=vertex で projectId/location を読む", () => {
    vi.stubEnv("CLAUDE_TRANSPORT", "vertex");
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("CLAUDE_LOCATION", "us");
    vi.stubEnv("CLAUDE_MODEL", "claude-sonnet-5");
    vi.stubEnv("CLAUDE_TIMEOUT_MS", "15000");

    expect(loadClaudeConfig()).toEqual({
      transport: "vertex",
      projectId: "my-project",
      location: "us",
      model: "claude-sonnet-5",
      timeoutMs: 15000,
    });
  });

  it("vertex: CLAUDE_LOCATION 未設定時は global を既定にする", () => {
    vi.stubEnv("CLAUDE_TRANSPORT", "vertex");
    vi.stubEnv("GCP_PROJECT_ID", "my-project");
    vi.stubEnv("CLAUDE_LOCATION", "");

    const config = loadClaudeConfig();
    expect(config.transport).toBe("vertex");
    expect(config).toMatchObject({ location: "global", model: "claude-opus-4-8" });
  });

  it("vertex: GCP_PROJECT_ID が欠けている場合、例外を投げる", () => {
    vi.stubEnv("CLAUDE_TRANSPORT", "vertex");
    vi.stubEnv("GCP_PROJECT_ID", "");
    expect(() => loadClaudeConfig()).toThrow("Missing env: GCP_PROJECT_ID");
  });

  it("CLAUDE_TIMEOUT_MS が不正値なら既定値 30000 を使う（api）", () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    vi.stubEnv("CLAUDE_TIMEOUT_MS", "abc");

    expect(loadClaudeConfig().timeoutMs).toBe(30000);
  });

  it("CLAUDE_TRANSPORT が未知の値なら例外を投げる（誤設定検知）", () => {
    vi.stubEnv("CLAUDE_TRANSPORT", "Vertex");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-ant-test");
    expect(() => loadClaudeConfig()).toThrow("Invalid CLAUDE_TRANSPORT: Vertex（api | vertex）");
  });
});
