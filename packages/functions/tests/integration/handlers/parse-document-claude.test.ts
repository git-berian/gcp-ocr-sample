import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockMessagesCreate } from "../helpers/mock-claude.js";
import {
  TEST_ENV,
  EXPECTED_CLAUDE_RECEIPT,
  MOCK_CLAUDE_RESPONSE,
  createMockReqRes,
} from "../helpers/fixtures.js";
import { handleParseDocumentClaude } from "../../../src/handlers/parse-document-claude.js";

describe("handleParseDocumentClaude（結合テスト）", () => {
  beforeEach(() => {
    mockMessagesCreate.mockReset();
    vi.stubEnv("GCP_PROJECT_ID", TEST_ENV.GCP_PROJECT_ID);
    vi.stubEnv("CLAUDE_LOCATION", TEST_ENV.CLAUDE_LOCATION);
    vi.stubEnv("CLAUDE_MODEL", TEST_ENV.CLAUDE_MODEL);
    vi.stubEnv("API_KEY", TEST_ENV.API_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: 認証・バリデーション・Claude を経て receipt を返す", async () => {
    mockMessagesCreate.mockResolvedValue(MOCK_CLAUDE_RESPONSE);

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentClaude(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ receipt: EXPECTED_CLAUDE_RECEIPT });
  });

  it("認証エラー: APIキーなしで 401 を返し、Claude を呼ばない", async () => {
    const { req, res } = createMockReqRes();
    await handleParseDocumentClaude(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("バリデーションエラー: サポート外の mimeType で 400 を返す", async () => {
    const { req, res } = createMockReqRes({
      body: { content: "base64data", mimeType: "text/plain" },
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentClaude(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });

  it("SDK エラー時は 500 を返す", async () => {
    mockMessagesCreate.mockRejectedValue(new Error("Vertex unavailable"));

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentClaude(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });

  it("設定エラー: GCP_PROJECT_ID 不足で 500 を返し、Claude を呼ばない", async () => {
    vi.stubEnv("GCP_PROJECT_ID", "");

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentClaude(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockMessagesCreate).not.toHaveBeenCalled();
  });
});
