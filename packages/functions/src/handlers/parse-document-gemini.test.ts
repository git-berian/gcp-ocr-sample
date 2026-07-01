import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleParseDocumentGemini } from "./parse-document-gemini.js";

vi.mock("../infrastructure/config.js", () => ({
  loadGeminiConfig: () => ({
    projectId: "test-project",
    location: "global",
    model: "gemini-2.5-flash",
    timeoutMs: 30000,
  }),
}));

const mockExtract = vi.fn();
vi.mock("../infrastructure/gemini-client.js", () => ({
  createGeminiReceiptExtractor: () => ({ extract: mockExtract }),
}));

type HandlerParams = Parameters<typeof handleParseDocumentGemini>;

function createMockReqRes(
  overrides: Partial<{
    method: string;
    body: unknown;
    path: string;
    headers: Record<string, string>;
  }> = {},
) {
  const { headers = {}, ...rest } = overrides;
  const req = {
    method: "POST",
    path: "/parseDocumentGemini",
    body: { content: "base64data", mimeType: "image/jpeg" },
    headers,
    ...rest,
  } as unknown as HandlerParams[0];

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as HandlerParams[1];

  return { req, res };
}

const TEST_API_KEY = "test-api-key-12345";

const mockReceipt = {
  supplierName: "テスト商店",
  receiptDate: "2026-05-16",
  totalAmount: 4800,
  taxAmount: 436,
  registrationNumber: "T1234567890123",
  transcription: "領収書",
  meta: { source: "gemini" as const },
};

describe("handleParseDocumentGemini", () => {
  beforeEach(() => {
    mockExtract.mockReset();
    vi.stubEnv("API_KEY", TEST_API_KEY);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("POST以外のメソッドは405を返す", async () => {
    const { req, res } = createMockReqRes({ method: "GET" });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      error: "許可されていないメソッドです。POST を使用してください。",
    });
  });

  it("Authorizationヘッダーなしは401を返す", async () => {
    const { req, res } = createMockReqRes();
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "認証が必要です。" });
  });

  it("不正なAPIキーは401を返す", async () => {
    const { req, res } = createMockReqRes({
      headers: { authorization: "Bearer wrong-key" },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "無効な API キーです。" });
  });

  it("バリデーションエラーは400を返す", async () => {
    const { req, res } = createMockReqRes({
      body: {},
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("正常なリクエストで receipt を返す", async () => {
    mockExtract.mockResolvedValue(mockReceipt);

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ receipt: mockReceipt });
  });

  it("抽出エラー時は500を返す", async () => {
    mockExtract.mockRejectedValue(new Error("Vertex error"));

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });

  it("Error以外の例外でも500を返す", async () => {
    mockExtract.mockRejectedValue("string error");

    const { req, res } = createMockReqRes({
      headers: { authorization: `Bearer ${TEST_API_KEY}` },
    });
    await handleParseDocumentGemini(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });
});
