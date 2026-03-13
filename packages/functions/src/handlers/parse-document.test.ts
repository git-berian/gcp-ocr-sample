import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Request, Response } from "@google-cloud/functions-framework";
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

function createMockReqRes(overrides: Partial<Request> = {}) {
  const req = {
    method: "POST",
    body: { content: "base64data", mimeType: "application/pdf" },
    ...overrides,
  } as unknown as Request;

  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;

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
    expect(res.json).toHaveBeenCalledWith({ error: "Method not allowed. Use POST." });
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
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });
});
