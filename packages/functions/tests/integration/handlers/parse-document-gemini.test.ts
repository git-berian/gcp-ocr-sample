import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockGenerateContent } from "../helpers/mock-gemini.js";
import {
  TEST_ENV,
  EXPECTED_GEMINI_RECEIPT,
  MOCK_GEMINI_RESPONSE,
  createMockReqRes,
} from "../helpers/fixtures.js";
import { handleParseDocumentGemini } from "../../../src/handlers/parse-document-gemini.js";

describe("handleParseDocumentGemini（結合テスト）", () => {
  beforeEach(() => {
    mockGenerateContent.mockReset();
    vi.stubEnv("GCP_PROJECT_ID", TEST_ENV.GCP_PROJECT_ID);
    vi.stubEnv("GEMINI_LOCATION", TEST_ENV.GEMINI_LOCATION);
    vi.stubEnv("GEMINI_MODEL", TEST_ENV.GEMINI_MODEL);
    vi.stubEnv("API_KEY", TEST_ENV.API_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: 認証・バリデーション・Gemini を経て receipt を返す", async () => {
    mockGenerateContent.mockResolvedValue(MOCK_GEMINI_RESPONSE);

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ receipt: EXPECTED_GEMINI_RECEIPT });
  });

  it("認証エラー: APIキーなしで 401 を返し、Gemini を呼ばない", async () => {
    const { req, res } = createMockReqRes();
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("バリデーションエラー: サポート外の mimeType で 400 を返す", async () => {
    const { req, res } = createMockReqRes({
      body: { content: "base64data", mimeType: "text/plain" },
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("SDK エラー時は 500 を返す", async () => {
    mockGenerateContent.mockRejectedValue(new Error("Vertex unavailable"));

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });

  it("設定エラー: GCP_PROJECT_ID 不足で 500 を返し、Gemini を呼ばない", async () => {
    vi.stubEnv("GCP_PROJECT_ID", "");

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });
});
