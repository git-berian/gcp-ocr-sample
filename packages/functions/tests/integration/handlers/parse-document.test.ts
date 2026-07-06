import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockProcessDocument } from "../helpers/mock-document-ai.js";
import {
  TEST_ENV,
  EXPECTED_PROCESSOR_NAME,
  EXPECTED_DOCAI_RECEIPT,
  MOCK_SDK_RESPONSE,
  VALID_REQUEST_BODY,
  createMockReqRes,
} from "../helpers/fixtures.js";
import { handleParseDocument } from "../../../src/handlers/parse-document.js";

describe("handleParseDocument（結合テスト）", () => {
  beforeEach(() => {
    mockProcessDocument.mockReset();
    vi.stubEnv("GCP_PROJECT_ID", TEST_ENV.GCP_PROJECT_ID);
    vi.stubEnv("DOCAI_LOCATION", TEST_ENV.DOCAI_LOCATION);
    vi.stubEnv("DOCAI_PROCESSOR_ID", TEST_ENV.DOCAI_PROCESSOR_ID);
    vi.stubEnv("FUNCTIONS_API_KEY", TEST_ENV.FUNCTIONS_API_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("正常系: 認証・バリデーション・Document AI 呼び出しを経て 200 + receipt を返す", async () => {
    mockProcessDocument.mockResolvedValue(MOCK_SDK_RESPONSE);

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.FUNCTIONS_API_KEY}` },
    });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ receipt: EXPECTED_DOCAI_RECEIPT });

    expect(mockProcessDocument).toHaveBeenCalledWith({
      name: EXPECTED_PROCESSOR_NAME,
      rawDocument: {
        content: VALID_REQUEST_BODY.content,
        mimeType: VALID_REQUEST_BODY.mimeType,
      },
    });
  });

  it("認証エラー: 不正な API キーで 401 を返し、SDK は呼ばれない", async () => {
    const { req, res } = createMockReqRes({
      headers: { authorization: "Bearer wrong-key" },
    });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockProcessDocument).not.toHaveBeenCalled();
  });

  it("バリデーションエラー: サポート外の mimeType で 400 を返す", async () => {
    const { req, res } = createMockReqRes({
      body: { content: "base64data", mimeType: "text/plain" },
      headers: { authorization: `Bearer ${TEST_ENV.FUNCTIONS_API_KEY}` },
    });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockProcessDocument).not.toHaveBeenCalled();
  });

  it("SDK エラー: Document AI がエラーを返した場合に 500 を返す", async () => {
    mockProcessDocument.mockRejectedValue(new Error("Document AI unavailable"));

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.FUNCTIONS_API_KEY}` },
    });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });

  it("設定エラー: 環境変数不足で 500 を返す", async () => {
    vi.stubEnv("GCP_PROJECT_ID", "");
    vi.stubEnv("DOCAI_LOCATION", "");
    vi.stubEnv("DOCAI_PROCESSOR_ID", "");

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_ENV.FUNCTIONS_API_KEY}` },
    });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
    expect(mockProcessDocument).not.toHaveBeenCalled();
  });
});
