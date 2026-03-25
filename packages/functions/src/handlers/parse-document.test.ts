import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { handleParseDocument } from "./parse-document.js";

vi.mock("../infrastructure/config.js", () => ({
  loadFunctionsConfig: () => ({
    projectId: "test-project",
    location: "us",
    processorId: "proc-123",
  }),
}));

const mockProcess = vi.fn();
vi.mock("../infrastructure/document-ai-client.js", () => ({
  createDocumentProcessor: () => ({ process: mockProcess }),
}));

type HandlerParams = Parameters<typeof handleParseDocument>;

function createMockReqRes(
  overrides: Partial<{ method: string; body: unknown; path: string }> = {},
) {
  const req = {
    method: "POST",
    body: { content: "base64data", mimeType: "application/pdf" },
    ...overrides,
  } as unknown as HandlerParams[0];

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as HandlerParams[1];

  return { req, res };
}

describe("handleParseDocument", () => {
  beforeEach(() => {
    mockProcess.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("POST以外のメソッドは405を返す", async () => {
    const { req, res } = createMockReqRes({ method: "GET" });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      error: "許可されていないメソッドです。POST を使用してください。",
    });
  });

  it("バリデーションエラーは400を返す", async () => {
    const { req, res } = createMockReqRes({ body: {} });
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("正常なリクエストでentitiesを返す", async () => {
    const mockEntities = [{ type: "total_amount", mentionText: "1,234", confidence: 0.95 }];
    mockProcess.mockResolvedValue(mockEntities);

    const { req, res } = createMockReqRes();
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ entities: mockEntities });
  });

  it("Document AI処理エラー時は500を返す", async () => {
    mockProcess.mockRejectedValue(new Error("API error"));

    const { req, res } = createMockReqRes();
    await handleParseDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "内部サーバーエラー" });
  });
});
